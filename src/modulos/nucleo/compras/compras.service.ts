import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  CrearOrdenCompraDto,
  PagarProveedorDto,
  RecepcionarDto,
} from './dto/compras.dto';

type TxPrisma = Prisma.TransactionClient;

/**
 * Módulo G (parte 2) — Compras. Crea órdenes de compra, contabiliza recepciones
 * (que ingresan stock vía InventoryLedgerEntry + StockBalance con costo promedio
 * ponderado y opcionalmente generan una cuenta por pagar) y aplica pagos a
 * proveedores contra las cuotas de esas cuentas por pagar.
 */
@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crearOrden(dto: CrearOrdenCompraDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      let subtotal = new Prisma.Decimal(0);
      let totalImpuesto = new Prisma.Decimal(0);
      const items = dto.items.map((item) => {
        const cantidad = new Prisma.Decimal(item.cantidad);
        const costo = new Prisma.Decimal(item.costoUnitario);
        const impuesto = new Prisma.Decimal(item.montoImpuesto ?? '0');
        const bruto = cantidad.mul(costo);
        subtotal = subtotal.add(bruto);
        totalImpuesto = totalImpuesto.add(impuesto);
        return {
          varianteId: item.varianteId,
          descripcion: item.descripcion,
          cantidad,
          costoUnitario: costo,
          montoImpuesto: impuesto,
          total: bruto.add(impuesto),
        };
      });
      const total = subtotal.add(totalImpuesto);

      const orden = await tx.purchaseOrder.create({
        data: {
          inquilinoId,
          sucursalId: dto.sucursalId,
          proveedorId: dto.proveedorId,
          number: dto.number,
          moneda: dto.moneda,
          subtotal,
          totalImpuesto,
          total,
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          notes: dto.notes ?? null,
          articulos: {
            create: items.map((i) => ({
              inquilinoId,
              varianteId: i.varianteId,
              descripcion: i.descripcion,
              cantidad: i.cantidad,
              costoUnitario: i.costoUnitario,
              montoImpuesto: i.montoImpuesto,
              total: i.total,
            })),
          },
        },
        select: { id: true, number: true, estado: true, total: true },
      });
      return orden;
    });
  }

  async listarOrdenes(proveedorId?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.purchaseOrder.findMany({
        where: { inquilinoId, proveedorId: proveedorId || undefined },
        orderBy: { creadoEn: 'desc' },
        take: 100,
        select: {
          id: true,
          number: true,
          proveedorId: true,
          estado: true,
          moneda: true,
          total: true,
          creadoEn: true,
        },
      }),
    );
  }

  /**
   * Contabiliza una recepción: ingresa stock por cada línea (ledger + balance con
   * costo promedio ponderado + lote opcional) y, si es a crédito, crea la cuenta
   * por pagar con su cuota. Idempotente por idempotencyKey.
   */
  async recepcionar(dto: RecepcionarDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.purchaseReceipt.findFirst({
        where: { inquilinoId, idempotencyKey: dto.idempotencyKey },
        select: { id: true, number: true, estado: true },
      });
      if (existente) return { ...existente, idempotente: true };

      let subtotal = new Prisma.Decimal(0);
      let totalImpuesto = new Prisma.Decimal(0);
      const lineas = dto.items.map((item) => {
        const cantidad = new Prisma.Decimal(item.cantidad);
        const costo = new Prisma.Decimal(item.costoUnitario);
        const impuesto = new Prisma.Decimal(item.montoImpuesto ?? '0');
        const bruto = cantidad.mul(costo);
        subtotal = subtotal.add(bruto);
        totalImpuesto = totalImpuesto.add(impuesto);
        return { item, cantidad, costo, impuesto, total: bruto.add(impuesto) };
      });
      const total = subtotal.add(totalImpuesto);
      const ahora = new Date();

      const recepcion = await tx.purchaseReceipt.create({
        data: {
          inquilinoId,
          idempotencyKey: dto.idempotencyKey,
          pedidoCompraId: dto.pedidoCompraId ?? null,
          almacenId: dto.almacenId,
          proveedorId: dto.proveedorId,
          number: dto.number,
          supplierDocumentType: dto.supplierDocumentType ?? null,
          supplierSeries: dto.supplierSeries ?? null,
          supplierNumber: dto.supplierNumber ?? null,
          estado: 'CONTABILIZADA',
          moneda: dto.moneda,
          subtotal,
          totalImpuesto,
          total,
          recibidoEn: ahora,
          postedAt: ahora,
        },
        select: { id: true, number: true, estado: true },
      });

      for (const linea of lineas) {
        await tx.purchaseReceiptItem.create({
          data: {
            inquilinoId,
            recepcionCompraId: recepcion.id,
            varianteId: linea.item.varianteId,
            cantidad: linea.cantidad,
            costoUnitario: linea.costo,
            montoImpuesto: linea.impuesto,
            total: linea.total,
            lotNumber: linea.item.lotNumber ?? null,
            venceEn: linea.item.venceEn ? new Date(linea.item.venceEn) : null,
          },
        });
        await this.ingresarStock(
          tx,
          inquilinoId,
          dto.almacenId,
          recepcion.id,
          linea.item.varianteId,
          linea.cantidad,
          linea.costo,
        );
        if (linea.item.lotNumber) {
          await this.registrarLote(
            tx,
            inquilinoId,
            dto.almacenId,
            linea.item.varianteId,
            linea.item.lotNumber,
            linea.cantidad,
            linea.item.venceEn ? new Date(linea.item.venceEn) : null,
          );
        }
      }

      if (dto.aCredito) {
        await this.crearCuentaPorPagar(
          tx,
          inquilinoId,
          recepcion.id,
          dto.proveedorId,
          dto.moneda,
          total,
          dto.diasCredito ?? 0,
          ahora,
        );
      }

      return { ...recepcion, total: total.toFixed(2), idempotente: false };
    });
  }

  /** Registra un pago a proveedor aplicándolo a cuotas de cuentas por pagar. */
  async pagarProveedor(dto: PagarProveedorDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.purchasePayment.findFirst({
        where: { inquilinoId, idempotencyKey: dto.idempotencyKey },
        select: { id: true },
      });
      if (existente) return { ...existente, idempotente: true };

      const totalAsignado = dto.asignaciones.reduce(
        (acc, a) => acc.add(new Prisma.Decimal(a.monto)),
        new Prisma.Decimal(0),
      );
      if (!totalAsignado.equals(new Prisma.Decimal(dto.monto))) {
        throw new BadRequestException(
          'La suma de asignaciones no coincide con el monto del pago',
        );
      }

      const pago = await tx.purchasePayment.create({
        data: {
          inquilinoId,
          proveedorId: dto.proveedorId,
          idempotencyKey: dto.idempotencyKey,
          method: dto.method,
          monto: new Prisma.Decimal(dto.monto),
          moneda: dto.moneda,
          referencia: dto.referencia ?? null,
          createdById: identidadUsuarioId,
        },
        select: { id: true },
      });

      const payablesTocados = new Set<string>();
      for (const asignacion of dto.asignaciones) {
        const cuota = await tx.payableInstallment.findFirst({
          where: { id: asignacion.cuotaId, inquilinoId },
          select: { id: true, payableId: true, montoPendiente: true },
        });
        if (!cuota) {
          throw new NotFoundException(
            `Cuota no encontrada: ${asignacion.cuotaId}`,
          );
        }
        const monto = new Prisma.Decimal(asignacion.monto);
        if (monto.gt(cuota.montoPendiente)) {
          throw new ConflictException(
            `El monto asignado supera el saldo de la cuota ${cuota.id}`,
          );
        }
        await tx.payablePaymentAllocation.create({
          data: {
            inquilinoId,
            paymentId: pago.id,
            installmentId: cuota.id,
            monto,
          },
        });
        const nuevoSaldo = cuota.montoPendiente.sub(monto);
        await tx.payableInstallment.update({
          where: { id: cuota.id },
          data: {
            montoPendiente: nuevoSaldo,
            estado: nuevoSaldo.lte(0) ? 'PAGADA' : 'PAGADA_PARCIALMENTE',
          },
        });
        payablesTocados.add(cuota.payableId);
      }

      for (const payableId of payablesTocados) {
        await this.recalcularPayable(tx, inquilinoId, payableId);
      }

      return { id: pago.id, idempotente: false };
    });
  }

  // ---- internals -----------------------------------------------------------

  /** Locks the stock row and posts an inbound entry with weighted-avg cost. */
  private async ingresarStock(
    tx: TxPrisma,
    inquilinoId: string,
    almacenId: string,
    recepcionId: string,
    varianteId: string,
    cantidad: Prisma.Decimal,
    costoUnitario: Prisma.Decimal,
  ) {
    const balances = await tx.$queryRaw<
      { id: string; enStock: Prisma.Decimal; costoPromedio: Prisma.Decimal }[]
    >`SELECT "id", "enStock", "costoPromedio" FROM "StockBalance"
      WHERE "inquilinoId" = ${inquilinoId}::uuid
        AND "almacenId" = ${almacenId}::uuid
        AND "varianteId" = ${varianteId}::uuid
      FOR UPDATE`;

    if (balances.length === 0) {
      await tx.stockBalance.create({
        data: {
          inquilinoId,
          almacenId,
          varianteId,
          enStock: cantidad,
          available: cantidad,
          costoPromedio: costoUnitario,
        },
      });
    } else {
      const balance = balances[0];
      const stockPrevio = new Prisma.Decimal(balance.enStock);
      const costoPrevio = new Prisma.Decimal(balance.costoPromedio);
      const stockNuevo = stockPrevio.add(cantidad);
      // Weighted average: (qty_prev*cost_prev + qty_in*cost_in) / qty_total.
      const costoPromedio = stockNuevo.gt(0)
        ? stockPrevio
            .mul(costoPrevio)
            .add(cantidad.mul(costoUnitario))
            .div(stockNuevo)
        : costoUnitario;
      await tx.stockBalance.update({
        where: { id: balance.id },
        data: {
          enStock: { increment: cantidad },
          available: { increment: cantidad },
          costoPromedio,
          version: { increment: 1 },
        },
      });
    }

    await tx.inventoryLedgerEntry.create({
      data: {
        inquilinoId,
        almacenId,
        varianteId,
        movementType: 'RECEPCION_COMPRA',
        cantidad,
        costoUnitario,
        totalCost: costoUnitario.mul(cantidad),
        referenciaType: 'RECEPCION_COMPRA',
        referenciaId: recepcionId,
        idempotencyKey: `${recepcionId}:${almacenId}:${varianteId}`,
        occurredAt: new Date(),
      },
    });
  }

  private async registrarLote(
    tx: TxPrisma,
    inquilinoId: string,
    almacenId: string,
    varianteId: string,
    lotNumber: string,
    cantidad: Prisma.Decimal,
    venceEn: Date | null,
  ) {
    await tx.inventoryLot.upsert({
      where: {
        inquilinoId_almacenId_varianteId_lotNumber: {
          inquilinoId,
          almacenId,
          varianteId,
          lotNumber,
        },
      },
      update: {
        cantidad: { increment: cantidad },
        venceEn: venceEn ?? undefined,
      },
      create: {
        inquilinoId,
        almacenId,
        varianteId,
        lotNumber,
        cantidad,
        venceEn,
      },
    });
  }

  private async crearCuentaPorPagar(
    tx: TxPrisma,
    inquilinoId: string,
    recepcionId: string,
    proveedorId: string,
    moneda: string,
    total: Prisma.Decimal,
    diasCredito: number,
    emitidoEn: Date,
  ) {
    const venceEn = new Date(
      emitidoEn.getTime() + diasCredito * 24 * 60 * 60 * 1000,
    );
    await tx.accountsPayable.create({
      data: {
        inquilinoId,
        proveedorId,
        recepcionCompraId: recepcionId,
        moneda,
        montoOriginal: total,
        montoPendiente: total,
        emitidoEn,
        venceEn,
        cuotas: {
          create: [
            {
              inquilinoId,
              installmentNo: 1,
              venceEn,
              monto: total,
              montoPendiente: total,
            },
          ],
        },
      },
    });
  }

  private async recalcularPayable(
    tx: TxPrisma,
    inquilinoId: string,
    payableId: string,
  ) {
    const cuotas = await tx.payableInstallment.findMany({
      where: { inquilinoId, payableId },
      select: { montoPendiente: true },
    });
    const pendiente = cuotas.reduce(
      (acc, c) => acc.add(c.montoPendiente),
      new Prisma.Decimal(0),
    );
    await tx.accountsPayable.update({
      where: { id: payableId },
      data: {
        montoPendiente: pendiente,
        estado: pendiente.lte(0) ? 'PAGADA' : 'PAGADA_PARCIALMENTE',
      },
    });
  }
}
