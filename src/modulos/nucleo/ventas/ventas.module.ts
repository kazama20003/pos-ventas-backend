import { Module } from '@nestjs/common';
import { IdentityModule } from '../identidad/identidad.module';
import { PromotionsModule } from '../promociones/promociones.module';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [IdentityModule, PromotionsModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class SalesModule {}
