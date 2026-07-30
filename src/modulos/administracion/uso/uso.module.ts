import { Module } from '@nestjs/common';
import { UsoController } from './uso.controller';
import { UsoService } from './uso.service';

/** Módulo I — Medición de uso del SaaS. */
@Module({
  controllers: [UsoController],
  providers: [UsoService],
})
export class UsageModule {}
