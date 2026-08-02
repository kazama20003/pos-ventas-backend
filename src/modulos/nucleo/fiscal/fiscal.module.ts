import { Module } from '@nestjs/common';
import { ConstructorComprobante } from './constructor-comprobante';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { PROVEEDOR_FACTURACION } from './proveedor/proveedor-facturacion';
import { ProveedorNubefact } from './proveedor/proveedor-nubefact';
import { ProveedorSandbox } from './proveedor/proveedor-sandbox';
import { ProcesadorFiscal } from './worker/procesador-fiscal';

/**
 * Módulo E — Facturación electrónica SUNAT. Emite FACTURA/BOLETA/NOTA_CREDITO
 * desde ventas, las encola (OutboxEvent) y un worker las envía al OSE/PSE.
 * El proveedor concreto se elige con FISCAL_PROVIDER (sandbox | nubefact).
 */
@Module({
  controllers: [FiscalController, SeriesController],
  providers: [
    FiscalService,
    SeriesService,
    ConstructorComprobante,
    ProcesadorFiscal,
    {
      provide: PROVEEDOR_FACTURACION,
      useFactory: () =>
        process.env.FISCAL_PROVIDER === 'nubefact'
          ? new ProveedorNubefact()
          : new ProveedorSandbox(),
    },
  ],
})
export class FiscalModule {}
