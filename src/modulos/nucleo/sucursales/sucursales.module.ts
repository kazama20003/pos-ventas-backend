import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../../administracion/suscripciones/suscripciones.module';
import { SucursalesController } from './sucursales.controller';
import { SucursalesService } from './sucursales.service';

/** CRUD de sucursales, almacenes y cajas (con gating de sucursales por plan). */
@Module({
  imports: [SubscriptionsModule],
  controllers: [SucursalesController],
  providers: [SucursalesService],
})
export class BranchesModule {}
