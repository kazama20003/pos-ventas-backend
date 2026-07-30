import { Module } from '@nestjs/common';
import { PlanesController } from './planes.controller';
import { PlanesService } from './planes.service';

/** Módulo I — Planes del catálogo SaaS. */
@Module({
  controllers: [PlanesController],
  providers: [PlanesService],
})
export class PlansModule {}
