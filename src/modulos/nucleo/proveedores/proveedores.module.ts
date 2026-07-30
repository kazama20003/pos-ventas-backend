import { Module } from '@nestjs/common';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';

/** Módulo G (parte 1) — Proveedores. */
@Module({
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
})
export class SuppliersModule {}
