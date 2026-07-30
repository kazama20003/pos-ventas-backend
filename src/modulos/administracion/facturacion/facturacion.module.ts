import { Module } from '@nestjs/common';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';

/** Módulo I — Facturación del SaaS al tenant. */
@Module({
  controllers: [FacturacionController],
  providers: [FacturacionService],
})
export class BillingModule {}
