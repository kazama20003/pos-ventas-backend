import { ResultadoEmision, SolicitudEmision } from '../fiscal.tipos';

/**
 * DI token for the pluggable electronic-invoicing provider (OSE/PSE). The
 * concrete binding is chosen in FiscalModule by the FISCAL_PROVIDER env var so
 * we can swap Nubefact / an OSE / a sandbox without touching business logic.
 */
export const PROVEEDOR_FACTURACION = Symbol('PROVEEDOR_FACTURACION');

/**
 * A provider signs, sends and resolves the SUNAT status of a document. It owns
 * all external I/O; the rest of the system only speaks the canonical
 * SolicitudEmision / ResultadoEmision contract and never sees provider details.
 */
export interface ProveedorFacturacion {
  readonly nombre: string;

  /** Emit (sign + send) a document and return its resolved SUNAT status. */
  emitir(solicitud: SolicitudEmision): Promise<ResultadoEmision>;
}
