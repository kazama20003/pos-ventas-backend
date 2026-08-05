import { Prisma } from '../../../../generado/operaciones/client';
import {
  MotorPromociones,
  type LineaPromo,
  type PromocionAplicable,
} from './motor-promociones';

const D = (n: number | string) => new Prisma.Decimal(n);

const motor = new MotorPromociones();

function promo(over: Partial<PromocionAplicable>): PromocionAplicable {
  return {
    id: 'p1',
    codigo: 'PROMO',
    nombre: 'Promo',
    tipoBeneficio: 'PORCENTAJE',
    valor: null,
    compraCantidad: null,
    pagaCantidad: null,
    cantidadMinima: null,
    prioridad: 0,
    productoIds: new Set(['prod-1']),
    alcanzaVenta: false,
    ...over,
  };
}

function linea(over: Partial<LineaPromo> = {}): LineaPromo {
  const cantidad = over.cantidad ?? D(2);
  const precioUnitario = over.precioUnitario ?? D(10);
  return {
    productoId: over.productoId ?? 'prod-1',
    cantidad,
    precioUnitario,
    montoBruto: over.montoBruto ?? cantidad.mul(precioUnitario),
  };
}

describe('MotorPromociones · descuentoDeLinea', () => {
  it('PORCENTAJE: 10% de 20 = 2', () => {
    const d = motor.descuentoDeLinea(
      promo({ tipoBeneficio: 'PORCENTAJE', valor: D(10) }),
      linea(),
    );
    expect(d?.monto.toFixed(2)).toBe('2.00');
    expect(d?.rate?.toString()).toBe('10');
  });

  it('MONTO_FIJO: 3 por unidad × 2 uds = 6', () => {
    const d = motor.descuentoDeLinea(
      promo({ tipoBeneficio: 'MONTO_FIJO', valor: D(3) }),
      linea(),
    );
    expect(d?.monto.toFixed(2)).toBe('6.00');
  });

  it('PRECIO_FIJO: precio 10 → oferta 8, 2 uds = 4 de descuento', () => {
    const d = motor.descuentoDeLinea(
      promo({ tipoBeneficio: 'PRECIO_FIJO', valor: D(8) }),
      linea(),
    );
    expect(d?.monto.toFixed(2)).toBe('4.00');
  });

  it('PRECIO_FIJO por encima del precio no genera descuento', () => {
    const d = motor.descuentoDeLinea(
      promo({ tipoBeneficio: 'PRECIO_FIJO', valor: D(15) }),
      linea(),
    );
    expect(d).toBeNull();
  });

  it('LLEVA_N_PAGA_M: 2x1, 4 uds → 2 gratis = 20', () => {
    const d = motor.descuentoDeLinea(
      promo({
        tipoBeneficio: 'LLEVA_N_PAGA_M',
        compraCantidad: 2,
        pagaCantidad: 1,
      }),
      linea({ cantidad: D(4), precioUnitario: D(10), montoBruto: D(40) }),
    );
    expect(d?.monto.toFixed(2)).toBe('20.00');
  });

  it('3x2: 6 uds → 2 gratis = 20', () => {
    const d = motor.descuentoDeLinea(
      promo({
        tipoBeneficio: 'LLEVA_N_PAGA_M',
        compraCantidad: 3,
        pagaCantidad: 2,
      }),
      linea({ cantidad: D(6), precioUnitario: D(10), montoBruto: D(60) }),
    );
    expect(d?.monto.toFixed(2)).toBe('20.00');
  });

  it('no aplica si el producto no está en el alcance', () => {
    const d = motor.descuentoDeLinea(
      promo({ tipoBeneficio: 'PORCENTAJE', valor: D(10) }),
      linea({ productoId: 'otro' } as Partial<LineaPromo>),
    );
    expect(d).toBeNull();
  });

  it('respeta la cantidad mínima', () => {
    const d = motor.descuentoDeLinea(
      promo({ tipoBeneficio: 'PORCENTAJE', valor: D(10), cantidadMinima: D(5) }),
      linea({ cantidad: D(2) }),
    );
    expect(d).toBeNull();
  });

  it('el descuento nunca supera la base', () => {
    const d = motor.descuentoDeLinea(
      promo({ tipoBeneficio: 'MONTO_FIJO', valor: D(999) }),
      linea({ cantidad: D(1), precioUnitario: D(10), montoBruto: D(10) }),
    );
    expect(d?.monto.toFixed(2)).toBe('10.00');
  });

  it('alcanzaVenta aplica a cualquier producto', () => {
    const d = motor.descuentoDeLinea(
      promo({
        tipoBeneficio: 'PORCENTAJE',
        valor: D(10),
        productoIds: new Set(),
        alcanzaVenta: true,
      }),
      linea({ productoId: 'cualquiera' } as Partial<LineaPromo>),
    );
    expect(d?.monto.toFixed(2)).toBe('2.00');
  });
});

describe('MotorPromociones · mejorDescuento', () => {
  it('elige el de mayor monto', () => {
    const promos = [
      promo({ id: 'a', tipoBeneficio: 'PORCENTAJE', valor: D(10) }),
      promo({ id: 'b', tipoBeneficio: 'PORCENTAJE', valor: D(25) }),
    ];
    const d = motor.mejorDescuento(promos, linea());
    expect(d?.promocionId).toBe('b');
    expect(d?.monto.toFixed(2)).toBe('5.00');
  });

  it('a igual monto, mayor prioridad gana', () => {
    const promos = [
      promo({ id: 'a', tipoBeneficio: 'PORCENTAJE', valor: D(10), prioridad: 1 }),
      promo({ id: 'b', tipoBeneficio: 'PORCENTAJE', valor: D(10), prioridad: 9 }),
    ];
    const d = motor.mejorDescuento(promos, linea());
    expect(d?.promocionId).toBe('b');
  });

  it('devuelve null si ninguna aplica', () => {
    const promos = [promo({ cantidadMinima: D(99) })];
    expect(motor.mejorDescuento(promos, linea())).toBeNull();
  });
});
