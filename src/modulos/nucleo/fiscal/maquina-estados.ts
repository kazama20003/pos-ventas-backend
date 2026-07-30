import { EstadoDocumentoElectronico } from '../../../../generado/operaciones/client';

/**
 * Valid state transitions for an electronic document. The emission pipeline
 * must never jump states arbitrarily: this table is the single source of truth
 * and `puedeTransicionar` guards every write in FiscalService/ProcesadorFiscal.
 *
 *   BORRADOR → EN_COLA → FIRMADO → ENVIADO → ACEPTADO / ACEPTADO_CON_OBSERVACIONES
 *                                          → RECHAZADO
 *   (cualquiera en vuelo) → ERROR → EN_COLA (reintento)
 *   ACEPTADO → BAJA_SOLICITADA → ANULADO
 */
const TRANSICIONES: Record<
  EstadoDocumentoElectronico,
  EstadoDocumentoElectronico[]
> = {
  BORRADOR: ['EN_COLA', 'ERROR'],
  EN_COLA: ['FIRMADO', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ERROR'],
  FIRMADO: ['ENVIADO', 'ERROR'],
  ENVIADO: ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES', 'RECHAZADO', 'ERROR'],
  ACEPTADO: ['BAJA_SOLICITADA'],
  ACEPTADO_CON_OBSERVACIONES: ['BAJA_SOLICITADA'],
  RECHAZADO: ['EN_COLA'],
  ERROR: ['EN_COLA'],
  BAJA_SOLICITADA: ['ANULADO', 'ERROR'],
  ANULADO: [],
};

/** Terminal states: no further automatic processing. */
export const ESTADOS_FINALES: EstadoDocumentoElectronico[] = [
  'ACEPTADO',
  'ACEPTADO_CON_OBSERVACIONES',
  'ANULADO',
];

/** States the worker should pick up and (re)send to the provider. */
export const ESTADOS_PROCESABLES: EstadoDocumentoElectronico[] = [
  'EN_COLA',
  'ERROR',
];

export function puedeTransicionar(
  desde: EstadoDocumentoElectronico,
  hacia: EstadoDocumentoElectronico,
): boolean {
  return TRANSICIONES[desde]?.includes(hacia) ?? false;
}
