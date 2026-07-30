import { Module } from '@nestjs/common';
import { CaracteristicasController } from './caracteristicas.controller';
import { CaracteristicasService } from './caracteristicas.service';

/** Módulo I — Características (features) del catálogo SaaS. */
@Module({
  controllers: [CaracteristicasController],
  providers: [CaracteristicasService],
})
export class FeaturesModule {}
