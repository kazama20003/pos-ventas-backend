import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IntervaloFacturacion } from '../../../../generado/administracion/client';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  CambiarPlanDto,
  CancelarSuscripcionDto,
  SuscribirDto,
} from './dto/suscripciones.dto';

/**
 * Suscripción del tenant a un plan (tenant-scoped, RLS). Al suscribir, los
 * PlanFeature de la versión se materializan como SubscriptionEntitlement (foto
 * inmutable del plan en ese momento), que EntitlementsService luego consulta
 * para el gating.
 */
@Injectable()
export class SuscripcionesService {
  constructor(
    private readonly db: ManagementPrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async suscribir(dto: SuscribirDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const vigente = await tx.subscription.findFirst({
        where: {
          inquilinoId,
          estado: { in: ['ACTIVA', 'EN_PRUEBA', 'IMPAGA', 'PAUSADA'] },
        },
        select: { id: true },
      });
      if (vigente) {
        throw new ConflictException(
          'El tenant ya tiene una suscripción vigente',
        );
      }

      const version = await tx.planVersion.findUnique({
        where: { id: dto.versionPlanId },
        include: { features: true, prices: { where: { isActive: true } } },
      });
      if (!version) {
        throw new NotFoundException('Versión de plan no encontrada');
      }
      if (version.estado !== 'ACTIVA') {
        throw new ConflictException('La versión de plan no está activa');
      }

      const ahora = new Date();
      const enPrueba = (version.trialDays ?? 0) > 0;
      const precio = version.prices[0];
      const finPeriodo = this.finPeriodo(
        ahora,
        precio?.interval ?? 'MES',
        precio?.intervalCount ?? 1,
      );

      const sub = await tx.subscription.create({
        data: {
          inquilinoId,
          versionPlanId: version.id,
          estado: enPrueba ? 'EN_PRUEBA' : 'ACTIVA',
          iniciadoEn: ahora,
          trialStartsAt: enPrueba ? ahora : null,
          trialEndsAt: enPrueba
            ? this.addDias(ahora, version.trialDays ?? 0)
            : null,
          currentPeriodStartsAt: ahora,
          currentPeriodEndsAt: finPeriodo,
        },
        select: { id: true, estado: true },
      });

      for (const pf of version.features) {
        await tx.subscriptionEntitlement.create({
          data: {
            suscripcionId: sub.id,
            caracteristicaId: pf.caracteristicaId,
            enabled: pf.enabled,
            limitValue: pf.limitValue,
            valor: pf.valor,
            resetPeriod: pf.resetPeriod,
          },
        });
      }

      return {
        id: sub.id,
        estado: sub.estado,
        currentPeriodEndsAt: finPeriodo,
      };
    });
  }

  async cambiarPlan(dto: CambiarPlanDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sub = await tx.subscription.findFirst({
        where: { inquilinoId, estado: { in: ['ACTIVA', 'EN_PRUEBA'] } },
        select: { id: true },
      });
      if (!sub) {
        throw new NotFoundException('El tenant no tiene suscripción activa');
      }
      const version = await tx.planVersion.findUnique({
        where: { id: dto.versionPlanId },
        include: { features: true },
      });
      if (!version || version.estado !== 'ACTIVA') {
        throw new ConflictException('La versión de plan no está activa');
      }

      const ahora = new Date();
      await tx.subscriptionEntitlement.updateMany({
        where: { suscripcionId: sub.id, vigenteHasta: null },
        data: { vigenteHasta: ahora },
      });
      await tx.subscription.update({
        where: { id: sub.id },
        data: { versionPlanId: version.id },
      });
      for (const pf of version.features) {
        await tx.subscriptionEntitlement.create({
          data: {
            suscripcionId: sub.id,
            caracteristicaId: pf.caracteristicaId,
            enabled: pf.enabled,
            limitValue: pf.limitValue,
            valor: pf.valor,
            resetPeriod: pf.resetPeriod,
            vigenteDesde: ahora,
          },
        });
      }
      return { id: sub.id, versionPlanId: version.id };
    });
  }

  async cancelar(dto: CancelarSuscripcionDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sub = await tx.subscription.findFirst({
        where: { inquilinoId, estado: { in: ['ACTIVA', 'EN_PRUEBA'] } },
        select: { id: true, currentPeriodEndsAt: true },
      });
      if (!sub) {
        throw new NotFoundException('El tenant no tiene suscripción activa');
      }
      const ahora = new Date();
      if (dto.alFinalDePeriodo) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            cancelAtPeriodEnd: true,
            cancelAt: sub.currentPeriodEndsAt ?? ahora,
            estado: 'PENDIENTE_CANCELACION',
          },
        });
        return { id: sub.id, estado: 'PENDIENTE_CANCELACION' as const };
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: { estado: 'CANCELADA', canceladoEn: ahora, terminadoEn: ahora },
      });
      await tx.subscriptionEntitlement.updateMany({
        where: { suscripcionId: sub.id, vigenteHasta: null },
        data: { vigenteHasta: ahora },
      });
      return { id: sub.id, estado: 'CANCELADA' as const };
    });
  }

  async miSuscripcion() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.subscription.findFirst({
        where: {
          inquilinoId,
          estado: { in: ['ACTIVA', 'EN_PRUEBA', 'PENDIENTE_CANCELACION'] },
        },
        orderBy: { creadoEn: 'desc' },
        include: {
          planVersion: { include: { plan: true } },
          entitlements: {
            where: {
              OR: [
                { vigenteHasta: null },
                { vigenteHasta: { gt: new Date() } },
              ],
            },
            include: { feature: true },
          },
        },
      }),
    );
  }

  private addDias(desde: Date, dias: number): Date {
    return new Date(desde.getTime() + dias * 24 * 60 * 60 * 1000);
  }

  private finPeriodo(
    desde: Date,
    interval: IntervaloFacturacion,
    count: number,
  ): Date {
    const r = new Date(desde);
    switch (interval) {
      case 'DIA':
        r.setDate(r.getDate() + count);
        break;
      case 'SEMANA':
        r.setDate(r.getDate() + 7 * count);
        break;
      case 'ANIO':
        r.setFullYear(r.getFullYear() + count);
        break;
      case 'MES':
      default:
        r.setMonth(r.getMonth() + count);
        break;
    }
    return r;
  }
}
