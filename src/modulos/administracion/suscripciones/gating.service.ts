import { ForbiddenException, Injectable } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

/**
 * Puerta de enforcement del gating por plan para el núcleo. Envuelve
 * EntitlementsService y lanza 403 cuando una acción excede el plan.
 *
 * Interruptor: se activa solo con GATING_ENABLED=true. Queda CABLEADO pero
 * APAGADO por defecto para no bloquear tenants que aún no tienen suscripción/
 * planes configurados. Al montar el catálogo de planes, encender la env.
 */
@Injectable()
export class GatingService {
  private readonly habilitado = process.env.GATING_ENABLED === 'true';

  constructor(private readonly entitlements: EntitlementsService) {}

  /**
   * Exige que el tenant actual pueda usar `featureClave` dentro de su límite.
   * `usoActual` es el consumo ya existente (ej. usuarios activos) contra el que
   * se compara el límite del plan. No-op si el gating está apagado.
   */
  async exigir(featureClave: string, usoActual = 0): Promise<void> {
    if (!this.habilitado) return;
    const resultado = await this.entitlements.verificarPorContexto(
      featureClave,
      usoActual,
    );
    if (!resultado.permitido) {
      throw new ForbiddenException(
        resultado.motivo ?? 'La acción excede los límites del plan contratado',
      );
    }
  }
}
