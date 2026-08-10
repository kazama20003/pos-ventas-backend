import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { ConfirmarSubidaDto, PresignSubidaDto } from './dto/archivos.dto';

/** Tamaño máximo de imagen (bytes). */
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
/** Vigencia de la URL prefirmada de subida (segundos). */
const PRESIGN_TTL = 300;

type ConfigAlmacen = {
  projectId?: string;
  bucket: string;
  publicUrl: string;
};

/**
 * Subida de archivos a Google Cloud Storage. Usa Application Default Credentials:
 * la cuenta de servicio de Cloud Run en producción y GOOGLE_APPLICATION_CREDENTIALS
 * para desarrollo local. Solo firma URLs y registra el FileObject.
 */
@Injectable()
export class ArchivosService {
  private readonly logger = new Logger(ArchivosService.name);
  private cliente: Storage | null = null;
  private config: ConfigAlmacen | null = null;

  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  private cargarConfig(): ConfigAlmacen {
    if (this.config) return this.config;
    const { GOOGLE_CLOUD_PROJECT, ALMACEN_GCS_BUCKET, ALMACEN_GCS_PUBLIC_URL } =
      process.env;

    if (!ALMACEN_GCS_BUCKET || !ALMACEN_GCS_PUBLIC_URL) {
      throw new ServiceUnavailableException(
        'El almacenamiento de archivos no está configurado (falta ALMACEN_GCS_*)',
      );
    }

    this.config = {
      projectId: GOOGLE_CLOUD_PROJECT || undefined,
      bucket: ALMACEN_GCS_BUCKET,
      publicUrl: ALMACEN_GCS_PUBLIC_URL.replace(/\/+$/, ''),
    };
    return this.config;
  }

  private obtenerCliente(): { cliente: Storage; config: ConfigAlmacen } {
    const config = this.cargarConfig();
    if (!this.cliente) {
      this.cliente = new Storage({ projectId: config.projectId });
    }
    return { cliente: this.cliente, config };
  }

  /** Deriva la extensión del nombre original; por defecto .bin. */
  private extension(fileName: string): string {
    const m = /\.([a-z0-9]{1,8})$/i.exec(fileName);
    return m ? `.${m[1].toLowerCase()}` : '';
  }

  private urlPublica(config: ConfigAlmacen, storageKey: string): string {
    return `${config.publicUrl}/${storageKey}`;
  }

  /**
   * Genera la URL prefirmada (PUT) para que el cliente suba el archivo directo
   * al bucket. NO crea FileObject todavía (falta tamaño/checksum).
   */
  async presignSubida(dto: PresignSubidaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const { cliente, config } = this.obtenerCliente();

    const purpose = dto.purpose?.trim() || 'product_image';
    // Clave estable y aislada por inquilino. Sin colisiones (uuid por fecha/rand
    // no disponible aquí de forma determinista → usamos un id de tiempo alto).
    const rand = Math.random().toString(36).slice(2, 10);
    const storageKey = `${inquilinoId}/${purpose}/${Date.now()}-${rand}${this.extension(
      dto.fileName,
    )}`;

    const [uploadUrl] = await cliente
      .bucket(config.bucket)
      .file(storageKey)
      .getSignedUrl({
        action: 'write',
        contentType: dto.contentType,
        expires: Date.now() + PRESIGN_TTL * 1000,
        version: 'v4',
      });

    return {
      storageKey,
      uploadUrl,
      publicUrl: this.urlPublica(config, storageKey),
      expiraEn: PRESIGN_TTL,
      maxBytes: MAX_BYTES,
    };
  }

  /** Registra el FileObject una vez subido y devuelve su URL pública. */
  async confirmarSubida(dto: ConfirmarSubidaDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    const config = this.cargarConfig();

    if (dto.byteSize > MAX_BYTES)
      throw new BadRequestException('La imagen supera el tamaño máximo (5 MB)');
    if (!dto.storageKey.startsWith(`${inquilinoId}/`))
      throw new BadRequestException('storageKey no pertenece al inquilino');

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const archivo = await tx.fileObject.upsert({
        where: {
          inquilinoId_storageKey: { inquilinoId, storageKey: dto.storageKey },
        },
        update: {
          byteSize: BigInt(dto.byteSize),
          checksumSha256: dto.checksumSha256,
          contentType: dto.contentType,
        },
        create: {
          inquilinoId,
          storageKey: dto.storageKey,
          fileName: dto.fileName,
          contentType: dto.contentType,
          byteSize: BigInt(dto.byteSize),
          checksumSha256: dto.checksumSha256,
          purpose: dto.purpose?.trim() || 'product_image',
          createdById: identidadUsuarioId ?? null,
        },
        select: { id: true, storageKey: true },
      });
      return {
        fileId: archivo.id,
        publicUrl: this.urlPublica(config, archivo.storageKey),
      };
    });
  }
}
