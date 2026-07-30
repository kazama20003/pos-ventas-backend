import { EventoWebhook, ResultadoCargo, SolicitudCargo } from '../pagos.tipos';

/**
 * DI token de la pasarela de pagos pluggable. El binding concreto se elige en
 * PagosModule con la env PAGOS_PROVIDER (sandbox | culqi | …).
 */
export const PROVEEDOR_PAGO = Symbol('PROVEEDOR_PAGO');

/**
 * Una pasarela cobra y resuelve el estado de un pago. Es la única frontera con
 * el exterior; el resto del sistema solo usa SolicitudCargo/ResultadoCargo y los
 * webhooks normalizados.
 */
export interface ProveedorPago {
  readonly nombre: string;

  /** Crea el cargo en la pasarela y devuelve su estado resuelto. */
  crearCargo(solicitud: SolicitudCargo): Promise<ResultadoCargo>;

  /**
   * Verifica la firma y normaliza un webhook entrante. `cuerpo` es el cuerpo
   * crudo recibido; `headers` trae la firma de la pasarela.
   */
  interpretarWebhook(
    cuerpo: Buffer,
    headers: Record<string, string>,
  ): EventoWebhook;

  /**
   * Verifica la autenticidad de un webhook con la firma del proveedor y el
   * secreto del comercio. Devuelve true si es válido (o si no hay verificación
   * aplicable). `secreto` es la credencial del PaymentProviderAccount.
   */
  verificarFirma(
    cuerpo: Buffer,
    headers: Record<string, string>,
    secreto: string | null,
  ): boolean;
}
