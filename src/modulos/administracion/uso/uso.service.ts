import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/administracion/client';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CrearMedidorDto, RegistrarUsoDto } from './dto/uso.dto';

/**
 * Medición de uso del SaaS. Los medidores (UsageMeter) son catálogo global; los
 * eventos de uso (UsageEvent) son por tenant. Alimenta la facturación medida y
 * el gating por consumo.
 */
@Injectable()
export class UsoService {
  constructor(
    private readonly db: ManagementPrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  /** Crea un medidor (global, operador de plataforma). */
  async crearMedidor(dto: CrearMedidorDto) {
    const duplicado = await this.db.usageMeter.findUnique({
      where: { clave: dto.clave },
      select: { id: true },
    });
    if (duplicado) {
      throw new ConflictException(`Ya existe el medidor ${dto.clave}`);
    }
    return this.db.usageMeter.create({
      data: {
        clave: dto.clave,
        nombre: dto.nombre,
        aggregation: dto.aggregation,
        unit: dto.unit,
        period: dto.period,
        caracteristicaId: dto.caracteristicaId ?? null,
      },
    });
  }

  /** Registra un evento de uso del tenant. Idempotente por (source, key). */
  async registrar(dto: RegistrarUsoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const medidor = await this.db.usageMeter.findUnique({
      where: { clave: dto.medidorClave },
      select: { id: true },
    });
    if (!medidor) throw new NotFoundException('Medidor no encontrado');

    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.usageEvent.findFirst({
        where: {
          inquilinoId,
          source: 'api',
          idempotencyKey: dto.idempotencyKey,
        },
        select: { id: true },
      });
      if (existente) return { ...existente, idempotente: true };

      const evento = await tx.usageEvent.create({
        data: {
          inquilinoId,
          meterId: medidor.id,
          source: 'api',
          idempotencyKey: dto.idempotencyKey,
          cantidad: new Prisma.Decimal(dto.cantidad ?? '1'),
          subjectId: dto.subjectId ?? null,
          occurredAt: new Date(),
        },
        select: { id: true },
      });
      return { ...evento, idempotente: false };
    });
  }

  /** Suma de consumo de un medidor en un rango para el tenant actual. */
  async resumen(medidorClave: string, desde: Date, hasta: Date) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const medidor = await this.db.usageMeter.findUnique({
      where: { clave: medidorClave },
      select: { id: true, unit: true },
    });
    if (!medidor) throw new NotFoundException('Medidor no encontrado');

    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const agregado = await tx.usageEvent.aggregate({
        where: {
          inquilinoId,
          meterId: medidor.id,
          occurredAt: { gte: desde, lt: hasta },
        },
        _sum: { cantidad: true },
        _count: true,
      });
      return {
        medidor: medidorClave,
        unidad: medidor.unit,
        total: new Prisma.Decimal(agregado._sum.cantidad ?? 0).toString(),
        eventos: agregado._count,
      };
    });
  }
}
