import { Module } from '@nestjs/common';
import { IdentityModule } from '../identidad/identidad.module';
import { MotorPromociones } from './motor-promociones';
import { PromocionesController } from './promociones.controller';
import { PromocionesService } from './promociones.service';

/** Campañas de oferta y su resolución para caja/venta. */
@Module({
  imports: [IdentityModule],
  controllers: [PromocionesController],
  providers: [PromocionesService, MotorPromociones],
  exports: [PromocionesService, MotorPromociones],
})
export class PromotionsModule {}
