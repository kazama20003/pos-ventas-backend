import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/administracion/client';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import {
  AsignarFeatureDto,
  CrearPlanDto,
  CrearVersionDto,
  DefinirPrecioDto,
} from './dto/planes.dto';

/**
 * Catálogo GLOBAL de planes (no tenant-scoped). Un Plan tiene versiones; cada
 * versión declara sus características (PlanFeature, con límites) y sus precios
 * (CatalogPrice). Publicar una versión la vuelve ACTIVA para suscribirse.
 */
@Injectable()
export class PlanesService {
  constructor(private readonly db: ManagementPrismaService) {}

  async crearPlan(dto: CrearPlanDto) {
    const duplicado = await this.db.plan.findUnique({
      where: { codigo: dto.codigo },
      select: { id: true },
    });
    if (duplicado) {
      throw new ConflictException(`Ya existe el plan ${dto.codigo}`);
    }
    return this.db.plan.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
      },
    });
  }

  listarPlanes() {
    return this.db.plan.findMany({
      orderBy: { codigo: 'asc' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, estado: true, vigenteDesde: true },
        },
      },
    });
  }

  async obtenerVersion(versionId: string) {
    const version = await this.db.planVersion.findUnique({
      where: { id: versionId },
      include: {
        plan: true,
        features: { include: { feature: true } },
        prices: true,
      },
    });
    if (!version) throw new NotFoundException('Versión de plan no encontrada');
    return version;
  }

  /** Crea la siguiente versión (BORRADOR) de un plan. */
  async crearVersion(planId: string, dto: CrearVersionDto) {
    const plan = await this.db.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const ultima = await this.db.planVersion.findFirst({
      where: { planId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (ultima?.version ?? 0) + 1;

    return this.db.planVersion.create({
      data: {
        planId,
        version,
        trialDays: dto.trialDays ?? null,
        gracePeriodDays: dto.gracePeriodDays ?? 0,
      },
      select: { id: true, version: true, estado: true },
    });
  }

  /** Declara una característica del plan con su límite/valor (entitlement base). */
  async asignarFeature(versionId: string, dto: AsignarFeatureDto) {
    await this.exigirVersionBorrador(versionId);
    const feature = await this.db.feature.findUnique({
      where: { id: dto.caracteristicaId },
      select: { id: true },
    });
    if (!feature) throw new NotFoundException('Característica no encontrada');

    return this.db.planFeature.upsert({
      where: {
        versionPlanId_caracteristicaId: {
          versionPlanId: versionId,
          caracteristicaId: dto.caracteristicaId,
        },
      },
      update: {
        limitValue: dto.limitValue ? new Prisma.Decimal(dto.limitValue) : null,
        valor: dto.valor ?? null,
        resetPeriod: dto.resetPeriod ?? null,
      },
      create: {
        versionPlanId: versionId,
        caracteristicaId: dto.caracteristicaId,
        limitValue: dto.limitValue ? new Prisma.Decimal(dto.limitValue) : null,
        valor: dto.valor ?? null,
        resetPeriod: dto.resetPeriod ?? null,
      },
    });
  }

  /** Define el precio recurrente de la versión de plan. */
  async definirPrecio(versionId: string, dto: DefinirPrecioDto) {
    await this.exigirVersionBorrador(versionId);
    const duplicado = await this.db.catalogPrice.findUnique({
      where: { codigo: dto.codigo },
      select: { id: true },
    });
    if (duplicado) {
      throw new ConflictException(`Ya existe el precio ${dto.codigo}`);
    }
    return this.db.catalogPrice.create({
      data: {
        codigo: dto.codigo,
        versionPlanId: versionId,
        scope: 'VERSION_PLAN',
        moneda: dto.moneda,
        unitAmount: new Prisma.Decimal(dto.unitAmount),
        interval: dto.interval,
        intervalCount: dto.intervalCount ?? 1,
        includedQuantity: dto.includedQuantity
          ? new Prisma.Decimal(dto.includedQuantity)
          : null,
      },
    });
  }

  /** Publica la versión: BORRADOR → ACTIVA y retira las versiones activas previas. */
  async publicarVersion(versionId: string) {
    const version = await this.db.planVersion.findUnique({
      where: { id: versionId },
      select: { id: true, planId: true, estado: true },
    });
    if (!version) throw new NotFoundException('Versión de plan no encontrada');
    if (version.estado !== 'BORRADOR') {
      throw new ConflictException(
        `Solo se publica una versión en BORRADOR (estado ${version.estado})`,
      );
    }
    return this.db.$transaction(async (tx) => {
      await tx.planVersion.updateMany({
        where: { planId: version.planId, estado: 'ACTIVA' },
        data: { estado: 'RETIRADA', vigenteHasta: new Date() },
      });
      return tx.planVersion.update({
        where: { id: versionId },
        data: { estado: 'ACTIVA', vigenteDesde: new Date() },
        select: { id: true, version: true, estado: true, vigenteDesde: true },
      });
    });
  }

  private async exigirVersionBorrador(versionId: string) {
    const version = await this.db.planVersion.findUnique({
      where: { id: versionId },
      select: { estado: true },
    });
    if (!version) throw new NotFoundException('Versión de plan no encontrada');
    if (version.estado !== 'BORRADOR') {
      throw new ConflictException(
        'Solo se puede modificar una versión en BORRADOR',
      );
    }
  }
}
