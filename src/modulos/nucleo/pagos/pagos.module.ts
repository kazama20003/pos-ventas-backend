import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { PROVEEDOR_PAGO } from './proveedor/proveedor-pago';
import { ProveedorPagoCulqi } from './proveedor/proveedor-culqi';
import { ProveedorPagoSandbox } from './proveedor/proveedor-sandbox';

/**
 * Módulo de pagos con billetera/tarjeta. La pasarela concreta se elige con
 * PAGOS_PROVIDER (sandbox | culqi). Listo para producción al definir la env y
 * las credenciales (CULQI_SECRET_KEY) y registrar la PaymentProviderAccount.
 */
@Module({
  controllers: [PagosController],
  providers: [
    PagosService,
    {
      provide: PROVEEDOR_PAGO,
      useFactory: () =>
        process.env.PAGOS_PROVIDER === 'culqi'
          ? new ProveedorPagoCulqi()
          : new ProveedorPagoSandbox(),
    },
  ],
})
export class PaymentsModule {}
