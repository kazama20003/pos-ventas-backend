import {
  EstadoIntentoPago,
  EstadoTransaccionPago,
} from '../../../../generado/operaciones/client';

/**
 * Contratos provider-agnósticos del rail de pagos (billeteras/tarjeta). El
 * núcleo solo habla este lenguaje; cada pasarela (Culqi/MercadoPago/…) se adapta
 * detrás de ProveedorPago. Mismo patrón pluggable que la facturación SUNAT.
 */

/** Solicitud de cargo que el núcleo entrega a la pasarela. */
export interface SolicitudCargo {
  intentoId: string;
  monto: string;
  moneda: string;
  method: string;
  descripcion: string | null;
  /** Token de tarjeta / id de fuente / teléfono de billetera según la pasarela. */
  fuente: string | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
  /** Credencial secreta del comercio (llave del PaymentProviderAccount). */
  credencialSecreta: string | null;
}

/** Resultado de un cargo mapeado al lenguaje del núcleo. */
export interface ResultadoCargo {
  /** Estado del intento tras el cargo. */
  estadoIntento: EstadoIntentoPago;
  /** Estado de la transacción creada. */
  estadoTransaccion: EstadoTransaccionPago;
  transaccionProveedorId: string | null;
  codigoAutorizacion: string | null;
  codigoError: string | null;
  mensajeError: string | null;
  crudo: unknown;
}

/** Evento de webhook normalizado (confirmación asíncrona: Yape/QR, etc.). */
export interface EventoWebhook {
  eventoProveedorId: string;
  tipo: string;
  /** Referencia del comercio para ubicar la PaymentProviderAccount. */
  referenciaComerciante: string | null;
  transaccionProveedorId: string | null;
  intentoProveedorId: string | null;
  estadoTransaccion: EstadoTransaccionPago | null;
  estadoIntento: EstadoIntentoPago | null;
  crudo: unknown;
}
