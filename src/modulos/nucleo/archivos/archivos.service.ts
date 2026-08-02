import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { ConfirmarSubidaDto, PresignSubidaDto } from './dto/archivos.dto';

/** Tamaño máximo de imagen (bytes). */
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
/** Vigencia de la URL prefirmada de subida (segundos). */
const PRESIGN_TTL = 300;

type ConfigAlmacen = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  forcePathStyle: boolean;
};

/**
 * Subida de archivos a un object storage S3-compatible (AWS S3, Cloudflare R2,
 * MinIO). No crea nada en la nube: solo firma URLs y registra el FileObject.
 * Se configura por variables de entorno; si faltan, los endpoints responden
 * 503 con un mensaje claro (el resto del backend arranca igual).
 */
@Injectable()
export class ArchivosService {
  private readonly logger = new Logger(ArchivosService.name);
  private cliente: S3Client | null = null;
  private config: ConfigAlmacen | null = null;

  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  private cargarConfig(): ConfigAlmacen {
    if (this.config) return this.config;
    const {
      ALMACEN_S3_REGION,
      ALMACEN_S3_BUCKET,
      ALMACEN_S3_ACCESS_KEY,
      ALMACEN_S3_SECRET_KEY,
      ALMACEN_S3_PUBLIC_URL,
      ALMACEN_S3_ENDPOINT,
      ALMACEN_S3_FORCE_PATH_STYLE,
    } = process.env;

    if (
      !ALMACEN_S3_BUCKET ||
      !ALMACEN_S3_ACCESS_KEY ||
      !ALMACEN_S3_SECRET_KEY ||
      !ALMACEN_S3_PUBLIC_URL
    ) {
      throw new ServiceUnavailableException(
        'El almacenamiento de archivos no está configurado (falta ALMACEN_S3_*)',
      );
    }

    this.config = {
      endpoint: ALMACEN_S3_ENDPOINT || undefined,
      region: ALMACEN_S3_REGION || 'auto',
      bucket: ALMACEN_S3_BUCKET,
      accessKeyId: ALMACEN_S3_ACCESS_KEY,
      secretAccessKey: ALMACEN_S3_SECRET_KEY,
      publicUrl: ALMACEN_S3_PUBLIC_URL.replace(/\/+$/, ''),
      forcePathStyle: ALMACEN_S3_FORCE_PATH_STYLE === 'true',
    };
    return this.config;
  }

  private obtenerCliente(): { cliente: S3Client; config: ConfigAlmacen } {
    const config = this.cargarConfig();
    if (!this.cliente) {
      this.cliente = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
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

    const comando = new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      ContentType: dto.contentType,
    });
    const uploadUrl = await getSignedUrl(cliente, comando, {
      expiresIn: PRESIGN_TTL,
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
