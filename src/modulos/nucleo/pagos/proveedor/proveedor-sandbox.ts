import { Injectable, Logger } from '@nestjs/common';
import { EventoWebhook, ResultadoCargo, SolicitudCargo } from '../pagos.tipos';
import { ProveedorPago } from './proveedor-pago';

/**
 * Pasarela por defecto: aprueba todo al instante. Permite ejercer el rail
 * completo (intento → transacción → EXITOSO) en dev/test sin credenciales.
 * Cambiar por Culqi/MercadoPago con PAGOS_PROVIDER en producción.
 */
@Injectable()
export class ProveedorPagoSandbox implements ProveedorPago {
  readonly nombre = 'sandbox';
  private readonly logger = new Logger(ProveedorPagoSandbox.name);

  crearCargo(solicitud: SolicitudCargo): Promise<ResultadoCargo> {
    this.logger.log(
      `SANDBOX aprobando cargo ${solicitud.monto} ${solicitud.moneda} (${solicitud.method})`,
    );
    return Promise.resolve({
      estadoIntento: 'EXITOSO',
      estadoTransaccion: 'CAPTURADA',
      transaccionProveedorId: `SANDBOX-${solicitud.intentoId}`,
      codigoAutorizacion: 'OK',
      codigoError: null,
      mensajeError: null,
      crudo: { proveedor: 'sandbox', intentoId: solicitud.intentoId },
    });
  }

  verificarFirma(): boolean {
    return true;
  }

  interpretarWebhook(cuerpo: Buffer): EventoWebhook {
    const datos = JSON.parse(cuerpo.toString('utf8')) as Record<
      string,
      unknown
    >;
    return {
      eventoProveedorId: (datos.id as string) ?? `evt-${Date.now()}`,
      tipo: (datos.type as string) ?? 'charge.succeeded',
      referenciaComerciante: (datos.merchant as string) ?? null,
      transaccionProveedorId: (datos.transaction as string) ?? null,
      intentoProveedorId: (datos.intent as string) ?? null,
      estadoTransaccion: 'CAPTURADA',
      estadoIntento: 'EXITOSO',
      crudo: datos,
    };
  }
}
