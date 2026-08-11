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
  async ventasResumen(rango: RangoFechas, sucursalId?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.$queryRaw<
        { total: Prisma.Decimal | null; cantidad: bigint }[]
      >`SELECT COALESCE(SUM("total"), 0) AS total, COUNT(*) AS cantidad
        FROM "Sale"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "estado" NOT IN ('ANULADA', 'BORRADOR')
          AND "creadoEn" >= ${rango.desde} AND "creadoEn" < ${rango.hasta}
          ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}::uuid` : Prisma.empty}`;
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
  async ventasPorDia(rango: RangoFechas, sucursalId?: string) {
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
          ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}::uuid` : Prisma.empty}
        GROUP BY 1 ORDER BY 1 ASC`,
    );
  }

  /**
   * Ventas agregadas por sucursal en el rango (total, nº de ventas, ticket
   * promedio). Es el reporte comparativo multi-local.
   */
  async ventasPorSucursal(rango: RangoFechas) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.$queryRaw<
        {
          sucursalId: string;
          sucursal: string;
          codigo: string;
          total: Prisma.Decimal | null;
          cantidad: bigint;
        }[]
      >`SELECT s."sucursalId" AS "sucursalId",
               b."nombre" AS sucursal,
               b."codigo" AS codigo,
               COALESCE(SUM(s."total"), 0) AS total,
               COUNT(*) AS cantidad
        FROM "Sale" s
        JOIN "Branch" b ON b."id" = s."sucursalId"
        WHERE s."inquilinoId" = ${inquilinoId}::uuid
          AND s."estado" NOT IN ('ANULADA', 'BORRADOR')
          AND s."creadoEn" >= ${rango.desde} AND s."creadoEn" < ${rango.hasta}
        GROUP BY s."sucursalId", b."nombre", b."codigo"
        ORDER BY total DESC`;
      return filas.map((f) => {
        const total = new Prisma.Decimal(f.total ?? 0);
        const cantidad = Number(f.cantidad);
        return {
          sucursalId: f.sucursalId,
          sucursal: f.sucursal,
          codigo: f.codigo,
          total: total.toFixed(2),
          cantidad,
          ticketPromedio:
            cantidad > 0 ? total.div(cantidad).toFixed(2) : '0.00',
        };
      });
    });
  }

  /** Valor de inventario (a costo promedio) agregado por sucursal. */
  async inventarioPorSucursal() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.$queryRaw<
        {
          sucursalId: string;
          valor: Prisma.Decimal | null;
          skus: bigint;
        }[]
      >`SELECT w."sucursalId" AS "sucursalId",
               COALESCE(SUM(sb."enStock" * sb."costoPromedio"), 0) AS valor,
               COUNT(*) AS skus
        FROM "StockBalance" sb
        JOIN "Warehouse" w ON w."id" = sb."almacenId"
        WHERE sb."inquilinoId" = ${inquilinoId}::uuid
          AND sb."enStock" > 0
        GROUP BY w."sucursalId"`;
      return filas.map((f) => ({
        sucursalId: f.sucursalId,
        valorInventario: new Prisma.Decimal(f.valor ?? 0).toFixed(2),
        skus: Number(f.skus),
      }));
    });
  }

  /**
   * Reporte por sucursal: fusiona ventas del rango + valorizado de inventario
   * actual, una fila por sucursal (incluye sucursales sin ventas).
   */
  async reporteSucursales(rango: RangoFechas) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const [ventas, inventario, sucursales] = await Promise.all([
      this.ventasPorSucursal(rango),
      this.inventarioPorSucursal(),
      this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
        tx.branch.findMany({
          where: { inquilinoId, estado: 'ACTIVO' },
          select: { id: true, codigo: true, nombre: true },
          orderBy: { codigo: 'asc' },
        }),
      ),
    ]);
    const ventaPorId = new Map(ventas.map((v) => [v.sucursalId, v]));
    const invPorId = new Map(inventario.map((i) => [i.sucursalId, i]));

    const filas = sucursales.map((s) => {
      const v = ventaPorId.get(s.id);
      const i = invPorId.get(s.id);
      return {
        sucursalId: s.id,
        codigo: s.codigo,
        sucursal: s.nombre,
        ventasTotal: v?.total ?? '0.00',
        ventasCantidad: v?.cantidad ?? 0,
        ticketPromedio: v?.ticketPromedio ?? '0.00',
        valorInventario: i?.valorInventario ?? '0.00',
        skus: i?.skus ?? 0,
      };
    });

    const totales = filas.reduce(
      (acc, f) => ({
        ventasTotal: acc.ventasTotal.add(f.ventasTotal),
        ventasCantidad: acc.ventasCantidad + f.ventasCantidad,
        valorInventario: acc.valorInventario.add(f.valorInventario),
      }),
      {
        ventasTotal: new Prisma.Decimal(0),
        ventasCantidad: 0,
        valorInventario: new Prisma.Decimal(0),
      },
    );

    return {
      filas,
      totales: {
        ventasTotal: totales.ventasTotal.toFixed(2),
        ventasCantidad: totales.ventasCantidad,
        valorInventario: totales.valorInventario.toFixed(2),
      },
    };
  }

  /** Productos más vendidos (por importe) en el rango. */
  async topProductos(rango: RangoFechas, limite = 10, sucursalId?: string) {
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
          ${sucursalId ? Prisma.sql`AND s."sucursalId" = ${sucursalId}::uuid` : Prisma.empty}
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

  /**
   * Panel estratégico unificado para el dashboard: ventas de hoy con
   * comparación vs ayer, mes, serie de 7 días, top productos (hoy y mes),
   * finanzas (CxC/CxP, inventario valorizado) y señales operativas del día
   * (bajo stock, cajas abiertas, clientes nuevos, lotes por vencer).
   */
  async dashboard() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const ahora = new Date();
    const inicioDia = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const DIA = 24 * 60 * 60 * 1000;
    const inicioAyer = new Date(inicioDia.getTime() - DIA);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finDia = new Date(inicioDia.getTime() + DIA);
    const inicioSemana = new Date(inicioDia.getTime() - 6 * DIA);
    const enTreintaDias = new Date(inicioDia.getTime() + 30 * DIA);

    const [
      hoy,
      ayer,
      mes,
      serieSemana,
      topHoy,
      topMes,
      inventario,
      cxc,
      cxp,
      operacion,
    ] = await Promise.all([
      this.ventasResumen({ desde: inicioDia, hasta: finDia }),
      this.ventasResumen({ desde: inicioAyer, hasta: inicioDia }),
      this.ventasResumen({ desde: inicioMes, hasta: finDia }),
      this.ventasPorDia({ desde: inicioSemana, hasta: finDia }),
      this.topProductos({ desde: inicioDia, hasta: finDia }, 5),
      this.topProductos({ desde: inicioMes, hasta: finDia }, 5),
      this.inventarioValorizado(),
      this.cuentasPorCobrar(),
      this.cuentasPorPagar(),
      this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
        const [bajoStock, cajasAbiertas, clientesNuevosMes, lotesPorVencer] =
          await Promise.all([
            tx.$queryRaw<
              { n: bigint }[]
            >`SELECT COUNT(*) AS n FROM "StockBalance"
              WHERE "inquilinoId" = ${inquilinoId}::uuid
                AND "stockMinimo" > 0 AND "available" <= "stockMinimo"`,
            tx.cashSession.count({ where: { inquilinoId, estado: 'ABIERTA' } }),
            tx.customer.count({
              where: { inquilinoId, creadoEn: { gte: inicioMes } },
            }),
            tx.inventoryLot.count({
              where: {
                inquilinoId,
                cantidad: { gt: 0 },
                venceEn: { not: null, lte: enTreintaDias },
              },
            }),
          ]);
        return {
          bajoStock: Number(bajoStock[0]?.n ?? 0),
          cajasAbiertas,
          clientesNuevosMes,
          lotesPorVencer,
        };
      }),
    ]);

    // Serie normalizada de 7 días (rellena días sin ventas con 0).
    const porDia = new Map(
      serieSemana.map((f) => [
        new Date(f.dia).toISOString().slice(0, 10),
        {
          total: new Prisma.Decimal(f.total).toFixed(2),
          cantidad: Number(f.cantidad),
        },
      ]),
    );
    const semana = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(inicioSemana.getTime() + i * DIA);
      const clave = fecha.toISOString().slice(0, 10);
      return {
        fecha: clave,
        total: porDia.get(clave)?.total ?? '0.00',
        cantidad: porDia.get(clave)?.cantidad ?? 0,
      };
    });

    return {
      hoy,
      ayer,
      mes,
      semana,
      topProductosHoy: topHoy,
      topProductos: topMes,
      inventario,
      cxc,
      cxp,
      operacion,
    };
  }
}
