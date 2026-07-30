import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generado/administracion/client';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';

export interface ResultadoEntitlement {
  permitido: boolean;
  limite?: string;
  valor?: string | null;
  uso?: number;
  motivo?: string;
}

/**
 * Cerebro del gating por plan. Otros módulos consultan aquí si un tenant puede
 * usar una característica y si está dentro de su límite (ej. "plan básico = 1
 * sucursal"). Lee los entitlements vigentes de la suscripción activa del tenant.
 * Exportado por SubscriptionsModule para inyectarse desde el núcleo.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    private readonly db: ManagementPrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  /** Igual que verificar() pero resuelve el tenant desde el contexto de la solicitud. */
  verificarPorContexto(
    featureClave: string,
    usoActual = 0,
  ): Promise<ResultadoEntitlement> {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.verificar(inquilinoId, featureClave, usoActual);
  }

  /** Suscripción activa del tenant con sus entitlements vigentes. */
  async suscripcionActiva(inquilinoId: string) {
    return this.db.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.subscription.findFirst({
        where: {
          inquilinoId,
          estado: { in: ['ACTIVA', 'EN_PRUEBA'] },
        },
        orderBy: { creadoEn: 'desc' },
        include: {
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

  /**
   * Verifica si el tenant puede usar `featureClave`. Si la característica define
   * un límite numérico, compara contra `usoActual` (deny si lo alcanza/supera).
   */
  async verificar(
    inquilinoId: string,
    featureClave: string,
    usoActual = 0,
  ): Promise<ResultadoEntitlement> {
    const sub = await this.suscripcionActiva(inquilinoId);
    if (!sub) {
      return {
        permitido: false,
        motivo: 'El tenant no tiene suscripción activa',
      };
    }
    const ent = sub.entitlements.find((e) => e.feature.clave === featureClave);
    if (!ent) {
      return {
        permitido: false,
        motivo: 'La característica no está incluida en el plan',
      };
    }
    if (ent.enabled === false) {
      return {
        permitido: false,
        motivo: 'Característica deshabilitada en el plan',
      };
    }
    if (ent.limitValue != null) {
      const permitido = new Prisma.Decimal(usoActual).lt(ent.limitValue);
      return {
        permitido,
        limite: ent.limitValue.toString(),
        uso: usoActual,
        motivo: permitido ? undefined : 'Límite del plan alcanzado',
      };
    }
    return { permitido: true, valor: ent.valor };
  }
}
