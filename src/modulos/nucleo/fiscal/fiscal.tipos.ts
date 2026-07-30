import {
  AfectacionImpuesto,
  EstadoDocumentoElectronico,
  TipoDocumentoElectronico,
  TipoDocumentoIdentidad,
} from '../../../../generado/operaciones/client';

/**
 * SUNAT catalog constants and mappings for electronic invoicing. Kept in code
 * (not the DB) because they are national fiscal standards, versioned with the
 * app. Referenced by ConstructorComprobante when building a document from a sale.
 */

/** IGV rate applied to gravado lines (Peru, 18%). */
export const TASA_IGV = 18;

/** SUNAT Catalog 05: tax scheme for the general sales tax. */
export const ESQUEMA_IGV = {
  id: '1000',
  nombre: 'IGV',
  tipoTributo: 'VAT',
} as const;

/**
 * SUNAT Catalog 07 (tipo de afectación del IGV) + Catalog 16 (tipo de precio)
 * derived from our internal AfectacionImpuesto. `categoria` is UBL tax category.
 */
export const AFECTACION_SUNAT: Record<
  AfectacionImpuesto,
  { tipoAfectacion: string; categoriaCodigo: string; tipoPrecio: string }
> = {
  GRAVADO: { tipoAfectacion: '10', categoriaCodigo: 'S', tipoPrecio: '01' },
  EXONERADO: { tipoAfectacion: '20', categoriaCodigo: 'E', tipoPrecio: '01' },
  INAFECTO: { tipoAfectacion: '30', categoriaCodigo: 'O', tipoPrecio: '01' },
  // Gratuita: precio referencial (tipo 02), afectación "gravada gratuita".
  GRATUITO: { tipoAfectacion: '11', categoriaCodigo: 'Z', tipoPrecio: '02' },
  EXPORTACION: { tipoAfectacion: '40', categoriaCodigo: 'G', tipoPrecio: '01' },
};

/** SUNAT Catalog 06: identity document types mapped from our enum. */
export const DOC_IDENTIDAD_SUNAT: Record<TipoDocumentoIdentidad, string> = {
  DNI: '1',
  RUC: '6',
  CE: '4',
  PASAPORTE: '7',
  ID_TRIBUTARIO_EXTRANJERO: 'A',
  OTRO: '0',
};

/** SUNAT Catalog 01: electronic document type codes. */
export const TIPO_DOC_SUNAT: Record<TipoDocumentoElectronico, string> = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
};

/** Fiscal snapshot of the issuing company, frozen onto the document. */
export interface IssuerSnapshot {
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  ubigeo: string | null;
  direccion: string | null;
}

/** Fiscal snapshot of the customer, frozen onto the document. */
export interface CustomerSnapshot {
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  razonSocial: string;
  direccion: string | null;
}

/** Provider-agnostic emission request handed to a ProveedorFacturacion. */
export interface SolicitudEmision {
  documentoId: string;
  tipo: TipoDocumentoElectronico;
  tipoCodigo: string;
  serie: string;
  numero: string;
  moneda: string;
  fechaEmision: Date;
  fechaVencimiento: Date | null;
  emisor: IssuerSnapshot;
  cliente: CustomerSnapshot;
  totales: {
    gravado: string;
    exonerado: string;
    inafecto: string;
    gratuito: string;
    descuento: string;
    igv: string;
    total: string;
  };
  items: SolicitudEmisionItem[];
  leyendas: { codigo: string; valor: string }[];
  nota: {
    motivoCodigo: string;
    motivoTexto: string;
    docRelacionadoTipo: string;
    docRelacionadoSerie: string;
    docRelacionadoNumero: string;
  } | null;
}

export interface SolicitudEmisionItem {
  lineNumber: number;
  descripcion: string;
  codigoUnidad: string;
  cantidad: string;
  valorUnitario: string;
  precioUnitario: string;
  tipoAfectacion: string;
  tipoPrecio: string;
  porcentajeImpuesto: string;
  baseImponible: string;
  montoImpuesto: string;
  total: string;
}

/** Provider-agnostic emission result mapped back onto the document. */
export interface ResultadoEmision {
  aceptado: boolean;
  estado: EstadoDocumentoElectronico;
  ticket: string | null;
  codigoRespuesta: string | null;
  descripcion: string | null;
  xmlBase64: string | null;
  cdrBase64: string | null;
  /** Raw provider payload, persisted verbatim in the event log for audit. */
  crudo: unknown;
}
