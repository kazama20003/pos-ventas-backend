import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

/** Módulo G (parte 2) — Compras, recepciones y cuentas por pagar. */
@Module({
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class PurchasesModule {}
