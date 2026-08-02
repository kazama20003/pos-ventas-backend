import { Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { GatingService } from './gating.service';
import { SuscripcionesController } from './suscripciones.controller';
import { SuscripcionesService } from './suscripciones.service';

/**
 * Módulo I — Suscripciones + entitlements. Exporta EntitlementsService y
 * GatingService para que el núcleo pueda forzar límites por plan (gating).
 */
@Module({
  controllers: [SuscripcionesController],
  providers: [SuscripcionesService, EntitlementsService, GatingService],
  exports: [EntitlementsService, GatingService],
})
export class SubscriptionsModule {}
