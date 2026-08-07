import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';

/** Promoción ya normalizada para el cálculo (scopes resueltos a productos). */
export interface PromocionAplicable {
  id: string;
  codigo: string;
  nombre: string;
  tipoBeneficio:
    | 'PORCENTAJE'
    | 'MONTO_FIJO'
    | 'PRECIO_FIJO'
    | 'LLEVA_N_PAGA_M';
  valor: Prisma.Decimal | null;
  compraCantidad: number | null;
  pagaCantidad: number | null;
  cantidadMinima: Prisma.Decimal | null;
  /** Monto mínimo de la venta para que la promo aplique (null = sin mínimo). */
  montoMinimoVenta: Prisma.Decimal | null;
  /** Si es acumulable con otras; si no, compite por ser la mejor única. */
  acumulable: boolean;
  prioridad: number;
  /** Productos alcanzados (productoId). Vacío = alcance de toda la venta. */
  productoIds: Set<string>;
  alcanzaVenta: boolean;
}

/** Contexto de una línea del carrito para calcular su descuento. */
export interface LineaPromo {
  productoId: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  /** cantidad * precioUnitario (base sobre la que se descuenta). */
  montoBruto: Prisma.Decimal;
}

/** Descuento elegido para una línea. */
export interface DescuentoLinea {
  promocionId: string;
  codigo: string;
  descripcion: string;
  /** Monto de descuento (positivo, a 2 decimales, tope = montoBruto). */
  monto: Prisma.Decimal;
  /** Tasa aplicada si el beneficio es porcentual (para trazabilidad). */
  rate: Prisma.Decimal | null;
}

const CERO = new Prisma.Decimal(0);

/**
 * Calcula descuentos de promociones sobre las líneas de una venta. Es PURO
 * (sin DB): recibe promociones ya vigentes y con scope resuelto, y decide el
 * mejor beneficio por línea. Lo usan tanto la vista previa de caja como el
 * cobro definitivo, garantizando el mismo resultado.
 */
@Injectable()
export class MotorPromociones {
  /**
   * Descuento que una promoción daría a una línea. `null` si no aplica
   * (no alcanza el producto o no cumple la cantidad mínima).
   */
  descuentoDeLinea(
    promo: PromocionAplicable,
    linea: LineaPromo,
  ): DescuentoLinea | null {
    if (!promo.alcanzaVenta && !promo.productoIds.has(linea.productoId)) {
      return null;
    }
    if (promo.cantidadMinima && linea.cantidad.lt(promo.cantidadMinima)) {
      return null;
    }

    let monto = CERO;
    let rate: Prisma.Decimal | null = null;

    switch (promo.tipoBeneficio) {
      case 'PORCENTAJE': {
        const pct = promo.valor ?? CERO;
        rate = pct;
        monto = linea.montoBruto.mul(pct).div(100);
        break;
      }
      case 'MONTO_FIJO': {
        const porUnidad = promo.valor ?? CERO;
        monto = porUnidad.mul(linea.cantidad);
        break;
      }
      case 'PRECIO_FIJO': {
        const precioOferta = promo.valor ?? linea.precioUnitario;
        const nuevoBruto = precioOferta.mul(linea.cantidad);
        monto = linea.montoBruto.sub(nuevoBruto);
        break;
      }
      case 'LLEVA_N_PAGA_M': {
        const n = promo.compraCantidad ?? 0;
        const m = promo.pagaCantidad ?? 0;
        if (n > 0 && m >= 0 && m < n) {
          const unidades = Math.floor(Number(linea.cantidad));
          const gratis = Math.floor(unidades / n) * (n - m);
          monto = linea.precioUnitario.mul(gratis);
        }
        break;
      }
    }

    // Nunca negativo ni mayor que la base; redondeo a 2 decimales.
    if (monto.lte(0)) return null;
    if (monto.gt(linea.montoBruto)) monto = linea.montoBruto;
    monto = monto.toDP(2);
    if (monto.lte(0)) return null;

    return {
      promocionId: promo.id,
      codigo: promo.codigo,
      descripcion: promo.nombre,
      monto,
      rate,
    };
  }

  /**
   * Mejor descuento para una línea entre varias promociones: el de mayor monto;
   * a igualdad, la de mayor prioridad. No acumula (fase 1).
   */
  mejorDescuento(
    promos: PromocionAplicable[],
    linea: LineaPromo,
  ): DescuentoLinea | null {
    let mejor: DescuentoLinea | null = null;
    let mejorPrioridad = -Infinity;
    for (const promo of promos) {
      const d = this.descuentoDeLinea(promo, linea);
      if (!d) continue;
      if (
        !mejor ||
        d.monto.gt(mejor.monto) ||
        (d.monto.eq(mejor.monto) && promo.prioridad > mejorPrioridad)
      ) {
        mejor = d;
        mejorPrioridad = promo.prioridad;
      }
    }
    return mejor;
  }

  /**
   * Descuentos aplicables a una línea, respetando el monto mínimo de venta y la
   * acumulación: suma todas las promos acumulables más la mejor no acumulable.
   * El total nunca supera la base bruta de la línea.
   * @param totalVenta base bruta total de la venta (para el gate de mínimo).
   */
  descuentosDeLinea(
    promos: PromocionAplicable[],
    linea: LineaPromo,
    totalVenta: Prisma.Decimal,
  ): { total: Prisma.Decimal; detalles: DescuentoLinea[] } {
    const elegibles = promos.filter(
      (p) => !p.montoMinimoVenta || totalVenta.gte(p.montoMinimoVenta),
    );
    const detalles: DescuentoLinea[] = [];
    let mejorNoAcum: { promo: PromocionAplicable; d: DescuentoLinea } | null =
      null;

    for (const promo of elegibles) {
      const d = this.descuentoDeLinea(promo, linea);
      if (!d) continue;
      if (promo.acumulable) {
        detalles.push(d);
      } else if (
        !mejorNoAcum ||
        d.monto.gt(mejorNoAcum.d.monto) ||
        (d.monto.eq(mejorNoAcum.d.monto) &&
          promo.prioridad > mejorNoAcum.promo.prioridad)
      ) {
        mejorNoAcum = { promo, d };
      }
    }
    if (mejorNoAcum) detalles.push(mejorNoAcum.d);

    let total = detalles.reduce((acc, d) => acc.add(d.monto), CERO);
    // El total de descuentos no puede superar la base de la línea.
    if (total.gt(linea.montoBruto)) total = linea.montoBruto;
    return { total: total.toDP(2), detalles };
  }
}
