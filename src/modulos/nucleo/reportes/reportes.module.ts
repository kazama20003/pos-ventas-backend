import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

/** Módulo H — Reportes / analítica. */
@Module({
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportsModule {}
