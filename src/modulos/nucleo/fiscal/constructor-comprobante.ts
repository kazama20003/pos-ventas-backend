import { Injectable } from '@nestjs/common';
import {
  AfectacionImpuesto,
  Prisma,
  TipoDocumentoElectronico,
  TipoDocumentoIdentidad,
} from '../../../../generado/operaciones/client';
import {
  AFECTACION_SUNAT,
  CustomerSnapshot,
  ESQUEMA_IGV,
  IssuerSnapshot,
  TASA_IGV,
} from './fiscal.tipos';
import { montoEnLetras } from './numero-a-letras';

/** Minimal shape of a sale line needed to build a fiscal document item. */
export interface LineaVenta {
  lineNumber: number;
  varianteId: string | null;
  skuSnapshot: string | null;
  nombreSnapshot: string;
  unitCodeSnapshot: string | null;
  /** Código producto SUNAT (UNSPSC) ya resuelto por herencia. null = omitir. */
  sunatProductCode: string | null;
  afectacion: AfectacionImpuesto;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  valorUnitario: Prisma.Decimal;
  /** Descuento aplicado a la línea (promoción), sobre la base sin ICBPER. */
  discountAmount: Prisma.Decimal;
  montoImpuesto: Prisma.Decimal;
  /** Tributos de monto fijo de la línea (ICBPER). Ya incluido en `total`. */
  montoOtrosTributos: Prisma.Decimal;
  total: Prisma.Decimal;
}

/** Company/customer/lines needed to assemble a fiscal document. */
export interface EntradaComprobante {
  documentType: TipoDocumentoElectronico;
  moneda: string;
  emisor: {
    ruc: string;
    razonSocial: string;
    nombreComercial: string | null;
    ubigeo: string | null;
    direccion: string | null;
  };
  cliente: {
    documentType: TipoDocumentoIdentidad | null;
    documentNumber: string | null;
    razonSocial: string;
    direccion: string | null;
  };
  lineas: LineaVenta[];
}

/** Assembled pieces ready to persist as ElectronicDocument + children. */
export interface ComprobanteConstruido {
  issuerSnapshot: IssuerSnapshot;
  customerSnapshot: CustomerSnapshot;
  totales: {
    subtotal: Prisma.Decimal;
    taxableTotal: Prisma.Decimal;
    exemptTotal: Prisma.Decimal;
    unaffectedTotal: Prisma.Decimal;
    freeTotal: Prisma.Decimal;
    totalDescuento: Prisma.Decimal;
    totalImpuesto: Prisma.Decimal;
    otrosTributos: Prisma.Decimal;
    total: Prisma.Decimal;
  };
  items: ItemConstruido[];
  leyendas: { codigo: string; valor: string }[];
}

export interface ItemConstruido {
  lineNumber: number;
  varianteId: string | null;
  sku: string | null;
  descripcion: string;
  sunatUnitCode: string;
  sunatProductCode: string | null;
  affectation: AfectacionImpuesto;
  taxSchemeId: string;
  taxSchemeName: string;
  taxCategoryCode: string;
  priceTypeCode: string;
  taxPercent: Prisma.Decimal;
  cantidad: Prisma.Decimal;
  valorUnitario: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableBase: Prisma.Decimal;
  montoImpuesto: Prisma.Decimal;
  montoOtrosTributos: Prisma.Decimal;
  total: Prisma.Decimal;
}

const CERO = new Prisma.Decimal(0);

/**
 * Turns a paid sale into the fiscal representation SUNAT expects: immutable
 * issuer/customer snapshots, per-line tax classification (Catálogo 07), the
 * six-way total breakdown, and the mandatory "monto en letras" legend.
 */
@Injectable()
export class ConstructorComprobante {
  construir(entrada: EntradaComprobante): ComprobanteConstruido {
    const issuerSnapshot: IssuerSnapshot = {
      ruc: entrada.emisor.ruc,
      razonSocial: entrada.emisor.razonSocial,
      nombreComercial: entrada.emisor.nombreComercial,
      ubigeo: entrada.emisor.ubigeo,
      direccion: entrada.emisor.direccion,
    };
    const customerSnapshot: CustomerSnapshot = {
      tipoDocumento: entrada.cliente.documentType,
      numeroDocumento: entrada.cliente.documentNumber,
      razonSocial: entrada.cliente.razonSocial,
      direccion: entrada.cliente.direccion,
    };

    let taxableTotal = CERO;
    let exemptTotal = CERO;
    let unaffectedTotal = CERO;
    let freeTotal = CERO;
    let totalImpuesto = CERO;
    let otrosTributos = CERO;
    let totalDescuento = CERO;
    let total = CERO;

    const items = entrada.lineas.map((linea): ItemConstruido => {
      const mapa = AFECTACION_SUNAT[linea.afectacion];
      const baseImponible = linea.valorUnitario.mul(linea.cantidad).toDP(2);
      const esGratuito = linea.afectacion === 'GRATUITO';
      // Precio unitario coherente con el valor ya descontado: precio con IGV
      // por unidad = valor neto + IGV/unidad. Así precioUnitario × cantidad
      // reconcilia con el importe de la línea (sin ICBPER) y SUNAT lo valida.
      const precioUnitario = linea.cantidad.gt(0)
        ? linea.valorUnitario.add(linea.montoImpuesto.div(linea.cantidad))
        : linea.valorUnitario;

      if (esGratuito) freeTotal = freeTotal.add(baseImponible);
      else if (linea.afectacion === 'GRAVADO')
        taxableTotal = taxableTotal.add(baseImponible);
      else if (linea.afectacion === 'EXONERADO')
        exemptTotal = exemptTotal.add(baseImponible);
      else unaffectedTotal = unaffectedTotal.add(baseImponible);

      totalImpuesto = totalImpuesto.add(linea.montoImpuesto);
      otrosTributos = otrosTributos.add(linea.montoOtrosTributos);
      totalDescuento = totalDescuento.add(linea.discountAmount);
      // `linea.total` ya incluye el ICBPER: no re-sumar otrosTributos aquí.
      if (!esGratuito) total = total.add(linea.total);

      return {
        lineNumber: linea.lineNumber,
        varianteId: linea.varianteId,
        sku: linea.skuSnapshot,
        descripcion: linea.nombreSnapshot,
        sunatUnitCode: linea.unitCodeSnapshot ?? 'NIU',
        sunatProductCode: linea.sunatProductCode,
        affectation: linea.afectacion,
        taxSchemeId: ESQUEMA_IGV.id,
        taxSchemeName: ESQUEMA_IGV.nombre,
        taxCategoryCode: mapa.categoriaCodigo,
        priceTypeCode: mapa.tipoPrecio,
        taxPercent:
          linea.afectacion === 'GRAVADO' ? new Prisma.Decimal(TASA_IGV) : CERO,
        cantidad: linea.cantidad,
        valorUnitario: linea.valorUnitario,
        precioUnitario,
        discountAmount: linea.discountAmount,
        taxableBase: baseImponible,
        montoImpuesto: linea.montoImpuesto,
        montoOtrosTributos: linea.montoOtrosTributos,
        total: linea.total,
      };
    });

    const subtotal = taxableTotal.add(exemptTotal).add(unaffectedTotal);
    const totales = {
      subtotal,
      taxableTotal,
      exemptTotal,
      unaffectedTotal,
      freeTotal,
      totalDescuento,
      totalImpuesto,
      otrosTributos,
      total,
    };

    const leyendas = [
      {
        codigo: '1000',
        valor: montoEnLetras(total.toFixed(2), entrada.moneda),
      },
    ];

    return { issuerSnapshot, customerSnapshot, totales, items, leyendas };
  }
}
