import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';

interface RangoFechas {
  desde: Date;
  hasta: Date;
}

/**
 * Módulo H — Reportes/analítica. Consultas de solo lectura sobre lo ya
 * registrado (ventas, inventario, cuentas por cobrar/pagar) que alimentan el
 * dashboard del frontend. Todo confinado por tenant vía ejecutarEnTenant (RLS)
 * y filtro explícito por inquilinoId.
 */
@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  /** Totales de venta y ticket promedio en un rango (excluye anuladas). */
  async ventasResumen(rango: RangoFechas) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.$queryRaw<
        { total: Prisma.Decimal | null; cantidad: bigint }[]
      >`SELECT COALESCE(SUM("total"), 0) AS total, COUNT(*) AS cantidad
        FROM "Sale"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "estado" NOT IN ('ANULADA', 'BORRADOR')
          AND "creadoEn" >= ${rango.desde} AND "creadoEn" < ${rango.hasta}`;
      const fila = filas[0];
      const cantidad = Number(fila.cantidad);
      const total = new Prisma.Decimal(fila.total ?? 0);
      return {
        total: total.toFixed(2),
        cantidad,
        ticketPromedio: cantidad > 0 ? total.div(cantidad).toFixed(2) : '0.00',
      };
    });
  }

  /** Serie diaria de ventas para gráfico de barras. */
  async ventasPorDia(rango: RangoFechas) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(
      inquilinoId,
      (tx) =>
        tx.$queryRaw<{ dia: Date; total: Prisma.Decimal; cantidad: bigint }[]>`
        SELECT date_trunc('day', "creadoEn") AS dia,
               SUM("total") AS total, COUNT(*) AS cantidad
        FROM "Sale"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "estado" NOT IN ('ANULADA', 'BORRADOR')
          AND "creadoEn" >= ${rango.desde} AND "creadoEn" < ${rango.hasta}
        GROUP BY 1 ORDER BY 1 ASC`,
    );
  }

  /** Productos más vendidos (por importe) en el rango. */
  async topProductos(rango: RangoFechas, limite = 10) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(
      inquilinoId,
      (tx) =>
        tx.$queryRaw<
          {
            varianteId: string | null;
            nombre: string;
            cantidad: Prisma.Decimal;
            total: Prisma.Decimal;
          }[]
        >`
        SELECT si."varianteId" AS "varianteId",
               MAX(si."nombreSnapshot") AS nombre,
               SUM(si."cantidad") AS cantidad,
               SUM(si."total") AS total
        FROM "SaleItem" si
        JOIN "Sale" s ON s."id" = si."ventaId"
        WHERE si."inquilinoId" = ${inquilinoId}::uuid
          AND s."estado" NOT IN ('ANULADA', 'BORRADOR')
          AND s."creadoEn" >= ${rango.desde} AND s."creadoEn" < ${rango.hasta}
        GROUP BY si."varianteId"
        ORDER BY total DESC
        LIMIT ${limite}`,
    );
  }

  /** Valor del inventario a costo promedio, opcionalmente por almacén. */
  async inventarioValorizado(almacenId?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.$queryRaw<
        { valor: Prisma.Decimal | null; sku_count: bigint }[]
      >`SELECT COALESCE(SUM("enStock" * "costoPromedio"), 0) AS valor,
               COUNT(*) AS sku_count
        FROM "StockBalance"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "enStock" > 0
          ${almacenId ? Prisma.sql`AND "almacenId" = ${almacenId}::uuid` : Prisma.empty}`;
      return {
        valor: new Prisma.Decimal(filas[0].valor ?? 0).toFixed(2),
        skus: Number(filas[0].sku_count),
      };
    });
  }

  /** Resumen de cuentas por cobrar pendientes (saldo y vencidas). */
  async cuentasPorCobrar() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const agregado = await tx.accountsReceivable.aggregate({
        where: {
          inquilinoId,
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIALMENTE', 'VENCIDA'] },
        },
        _sum: { montoPendiente: true },
        _count: true,
      });
      const vencidas = await tx.accountsReceivable.count({
        where: {
          inquilinoId,
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIALMENTE', 'VENCIDA'] },
          venceEn: { lt: new Date() },
        },
      });
      return {
        saldoPendiente: new Prisma.Decimal(
          agregado._sum.montoPendiente ?? 0,
        ).toFixed(2),
        cuentas: agregado._count,
        vencidas,
      };
    });
  }

  /** Resumen de cuentas por pagar pendientes (saldo y vencidas). */
  async cuentasPorPagar() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const agregado = await tx.accountsPayable.aggregate({
        where: {
          inquilinoId,
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIALMENTE', 'VENCIDA'] },
        },
        _sum: { montoPendiente: true },
        _count: true,
      });
      const vencidas = await tx.accountsPayable.count({
        where: {
          inquilinoId,
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIALMENTE', 'VENCIDA'] },
          venceEn: { lt: new Date() },
        },
      });
      return {
        saldoPendiente: new Prisma.Decimal(
          agregado._sum.montoPendiente ?? 0,
        ).toFixed(2),
        cuentas: agregado._count,
        vencidas,
      };
    });
  }

  /** Panel unificado para el dashboard del frontend. */
  async dashboard() {
    const ahora = new Date();
    const inicioDia = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const [hoy, mes, top, inventario, cxc, cxp] = await Promise.all([
      this.ventasResumen({ desde: inicioDia, hasta: finDia }),
      this.ventasResumen({ desde: inicioMes, hasta: finDia }),
      this.topProductos({ desde: inicioMes, hasta: finDia }, 5),
      this.inventarioValorizado(),
      this.cuentasPorCobrar(),
      this.cuentasPorPagar(),
    ]);

    return { hoy, mes, topProductos: top, inventario, cxc, cxp };
  }
}
