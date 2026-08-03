import { Prisma } from '../../../../generado/operaciones/client';
import {
  ConstructorComprobante,
  EntradaComprobante,
  LineaVenta,
} from './constructor-comprobante';

const D = (v: string | number) => new Prisma.Decimal(v);

function entradaBase(lineas: LineaVenta[]): EntradaComprobante {
  return {
    documentType: 'BOLETA',
    moneda: 'PEN',
    emisor: {
      ruc: '20123456789',
      razonSocial: 'MI EMPRESA SAC',
      nombreComercial: null,
      ubigeo: null,
      direccion: null,
    },
    cliente: {
      documentType: null,
      documentNumber: null,
      razonSocial: 'CLIENTE VARIOS',
      direccion: null,
    },
    lineas,
  };
}

describe('ConstructorComprobante — ICBPER', () => {
  const armador = new ConstructorComprobante();

  it('declara el ICBPER aparte del IGV sin re-sumarlo al total', () => {
    // Línea 1: producto gravado, S/ 11.80 con IGV incluido (base 10 + IGV 1.80).
    const producto: LineaVenta = {
      lineNumber: 1,
      varianteId: null,
      skuSnapshot: 'PROD1',
      nombreSnapshot: 'Gaseosa',
      unitCodeSnapshot: 'NIU',
      sunatProductCode: null,
      afectacion: 'GRAVADO',
      cantidad: D(1),
      precioUnitario: D('11.80'),
      valorUnitario: D('10.00'),
      montoImpuesto: D('1.80'),
      montoOtrosTributos: D('0.00'),
      total: D('11.80'),
    };
    // Línea 2: 2 bolsas con ICBPER S/ 0.50 c/u (precio 0, solo ICBPER).
    const bolsa: LineaVenta = {
      lineNumber: 2,
      varianteId: null,
      skuSnapshot: 'BOLSA',
      nombreSnapshot: 'Bolsa plástica',
      unitCodeSnapshot: 'NIU',
      sunatProductCode: null,
      afectacion: 'GRAVADO',
      cantidad: D(2),
      precioUnitario: D('0.00'),
      valorUnitario: D('0.00'),
      montoImpuesto: D('0.00'),
      montoOtrosTributos: D('1.00'), // 0.50 × 2
      total: D('1.00'),
    };

    const c = armador.construir(entradaBase([producto, bolsa]));

    // IGV solo del producto.
    expect(c.totales.totalImpuesto.toFixed(2)).toBe('1.80');
    // ICBPER acumulado aparte.
    expect(c.totales.otrosTributos.toFixed(2)).toBe('1.00');
    // Total = 11.80 + 1.00 (ICBPER ya venía en linea.total, no se duplica).
    expect(c.totales.total.toFixed(2)).toBe('12.80');
    // El ICBPER viaja en el ítem de la bolsa.
    expect(c.items[1].montoOtrosTributos.toFixed(2)).toBe('1.00');
    expect(c.items[0].montoOtrosTributos.toFixed(2)).toBe('0.00');
  });

  it('sin ICBPER, otrosTributos es 0 y el IGV no cambia', () => {
    const producto: LineaVenta = {
      lineNumber: 1,
      varianteId: null,
      skuSnapshot: 'PROD1',
      nombreSnapshot: 'Camisa',
      unitCodeSnapshot: 'NIU',
      sunatProductCode: null,
      afectacion: 'GRAVADO',
      cantidad: D(1),
      precioUnitario: D('118.00'),
      valorUnitario: D('100.00'),
      montoImpuesto: D('18.00'),
      montoOtrosTributos: D('0.00'),
      total: D('118.00'),
    };

    const c = armador.construir(entradaBase([producto]));

    expect(c.totales.otrosTributos.toFixed(2)).toBe('0.00');
    expect(c.totales.totalImpuesto.toFixed(2)).toBe('18.00');
    expect(c.totales.total.toFixed(2)).toBe('118.00');
  });
});
