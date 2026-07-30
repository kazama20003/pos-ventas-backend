import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  CrearVentaDto,
  ItemVentaDto,
  MetodoPagoDto,
} from './dto/crear-venta.dto';
import { CrearDevolucionDto } from './dto/crear-devolucion.dto';
import { SincronizarVentasDto } from './dto/sincronizar-ventas.dto';

type TxPrisma = Prisma.TransactionClient;

interface CorrelativoReservado {
  numeroFormateado: string;
}

interface LineaCalculada {
  item: ItemVentaDto;
  lineNumber: number;
  sku: string;
  nombre: string;
  unidad: string;
  afectacionImpuesto:
    'GRAVADO' | 'EXONERADO' | 'INAFECTO' | 'GRATUITO' | 'EXPORTACION';
  isStockTracked: boolean;
  allowNegativeStock: boolean;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  montoBruto: Prisma.Decimal;
  montoImpuesto: Prisma.Decimal;
  total: Prisma.Decimal;
}

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crear(dto: CrearVentaDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      // Idempotency: a retry with the same key returns the original sale
      // instead of duplicating (safe for offline sync and network timeouts).
      const existente = await tx.sale.findUnique({
        where: {
          inquilinoId_idempotencyKey: {
            inquilinoId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        select: { id: true, number: true, total: true, estado: true },
      });
      if (existente) {
        return { ...existente, idempotente: true };
      }

      const cajero = await tx.membership.findFirst({
        where: { inquilinoId, identidadUsuarioId, estado: 'ACTIVA' },
        select: { id: true },
      });
      if (!cajero) {
        throw new ConflictException(
          'El usuario no tiene una membresía activa para vender',
        );
      }

      await this.exigirContextoComercial(tx, inquilinoId, dto);
      const lineas = await this.calcularLineas(tx, inquilinoId, dto);
      const subtotal = lineas.reduce(
        (acc, l) => acc.add(l.montoBruto),
        new Prisma.Decimal(0),
      );
      const totalImpuesto = lineas.reduce(
        (acc, l) => acc.add(l.montoImpuesto),
        new Prisma.Decimal(0),
      );
      const total = lineas.reduce(
        (acc, l) => acc.add(l.total),
        new Prisma.Decimal(0),
      );

      const correlativo = await this.reservarCorrelativo(
        tx,
        inquilinoId,
        dto.serieId,
      );

      const totalPagado = (dto.pagos ?? []).reduce(
        (acc, p) => acc.add(new Prisma.Decimal(p.monto)),
        new Prisma.Decimal(0),
      );
      const estado = this.resolverEstado(total, totalPagado);
      const totalVuelto = totalPagado.gt(total)
        ? totalPagado.sub(total)
        : new Prisma.Decimal(0);

      const venta = await tx.sale.create({
        data: {
          inquilinoId,
          empresaId: dto.empresaId,
          sucursalId: dto.sucursalId,
          sesionCajaId: dto.sesionCajaId ?? null,
          clienteId: dto.clienteId ?? null,
          cashierMembershipId: cajero.id,
          number: correlativo.numeroFormateado,
          idempotencyKey: dto.idempotencyKey,
          offlineId: dto.offlineId ?? null,
          offlineDeviceId: dto.offlineDeviceId ?? null,
          offlineCreatedAt: dto.offlineCreatedAtMs
            ? new Date(dto.offlineCreatedAtMs)
            : null,
          estado,
          moneda: dto.moneda,
          subtotal,
          totalImpuesto,
          total,
          totalPagado,
          totalVuelto,
          completadoEn: estado === 'PAGADA' ? new Date() : null,
        },
        select: { id: true },
      });

      for (const linea of lineas) {
        await this.registrarLinea(tx, inquilinoId, venta.id, linea);
      }

      for (const [indice, pago] of (dto.pagos ?? []).entries()) {
        await tx.salePayment.create({
          data: {
            inquilinoId,
            ventaId: venta.id,
            idempotencyKey: `${dto.idempotencyKey}:pago:${pago.method}:${pago.referencia ?? ''}:${pago.monto}`,
            method: pago.method,
            monto: new Prisma.Decimal(pago.monto),
            moneda: dto.moneda,
            referencia: pago.referencia ?? null,
          },
        });
        if (pago.method === MetodoPagoDto.EFECTIVO) {
          await tx.cashMovement.create({
            data: {
              inquilinoId,
              sesionCajaId: dto.sesionCajaId!,
              idempotencyKey: `${dto.idempotencyKey}:caja:${indice}`,
              tipo: 'VENTA_EFECTIVO',
              monto: new Prisma.Decimal(pago.monto),
              moneda: dto.moneda,
              referenciaType: 'VENTA',
              referenciaId: venta.id,
              actorId: identidadUsuarioId,
            },
          });
        }
      }

      // Venta a crédito: el saldo no pagado de un cliente identificado se
      // convierte en una cuenta por cobrar con su cuota (vencimiento según la
      // línea de crédito del cliente, o 30 días por defecto).
      if (dto.clienteId) {
        await this.generarCuentaPorCobrar(
          tx,
          inquilinoId,
          venta.id,
          dto.clienteId,
          dto.moneda,
          total,
          totalPagado,
        );
      }

      return {
        id: venta.id,
        number: correlativo.numeroFormateado,
        estado,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        totalPagado: totalPagado.toFixed(2),
        idempotente: false,
      };
    });
  }

  /** Crea la cuenta por cobrar por el saldo pendiente de una venta a crédito. */
  private async generarCuentaPorCobrar(
    tx: TxPrisma,
    inquilinoId: string,
    ventaId: string,
    clienteId: string,
    moneda: string,
    total: Prisma.Decimal,
    totalPagado: Prisma.Decimal,
  ): Promise<void> {
    const saldo = total.sub(totalPagado);
    if (saldo.lte(0)) return;

    const cuenta = await tx.customerCreditAccount.findFirst({
      where: { inquilinoId, clienteId, moneda },
      select: { paymentTermDays: true },
    });
    const dias = cuenta?.paymentTermDays ?? 30;
    const emitidoEn = new Date();
    const venceEn = new Date(emitidoEn.getTime() + dias * 24 * 60 * 60 * 1000);

    await tx.accountsReceivable.create({
      data: {
        inquilinoId,
        clienteId,
        ventaId,
        moneda,
        montoOriginal: saldo,
        montoPendiente: saldo,
        emitidoEn,
        venceEn,
        cuotas: {
          create: [
            {
              inquilinoId,
              installmentNo: 1,
              venceEn,
              monto: saldo,
              montoPendiente: saldo,
            },
          ],
        },
      },
    });
  }

  /**
   * Sincroniza un lote de ventas creadas offline. Cada venta se procesa aparte
   * (idempotente por idempotencyKey); un fallo individual no aborta el lote.
   */
  async sincronizar(dto: SincronizarVentasDto) {
    const resultados: Array<Record<string, unknown>> = [];
    for (const venta of dto.ventas) {
      try {
        const creada = await this.crear(venta);
        resultados.push({
          idempotencyKey: venta.idempotencyKey,
          offlineId: venta.offlineId ?? null,
          ok: true,
          ...creada,
        });
      } catch (error) {
        resultados.push({
          idempotencyKey: venta.idempotencyKey,
          offlineId: venta.offlineId ?? null,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return {
      total: dto.ventas.length,
      sincronizadas: resultados.filter((r) => r.ok).length,
      fallidas: resultados.filter((r) => !r.ok).length,
      resultados,
    };
  }

  /**
   * Registra una devolución (total o parcial) de una venta: reingresa el stock
   * de las líneas marcadas `restock` (ledger DEVOLUCION_VENTA) y, opcionalmente,
   * devuelve efectivo desde la caja. Idempotente por idempotencyKey.
   */
  async devolver(dto: CrearDevolucionDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.saleRefund.findFirst({
        where: { inquilinoId, idempotencyKey: dto.idempotencyKey },
        select: { id: true, number: true, estado: true },
      });
      if (existente) return { ...existente, idempotente: true };

      const venta = await tx.sale.findFirst({
        where: { id: dto.ventaId, inquilinoId },
        select: { id: true, estado: true, moneda: true },
      });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.estado === 'ANULADA') {
        throw new ConflictException('No se puede devolver una venta anulada');
      }

      const saleItems = await tx.saleItem.findMany({
        where: {
          inquilinoId,
          ventaId: dto.ventaId,
          id: { in: dto.items.map((i) => i.itemVentaId) },
        },
        include: { variant: { select: { isStockTracked: true } } },
      });
      const porId = new Map(saleItems.map((si) => [si.id, si]));

      let subtotal = new Prisma.Decimal(0);
      let totalImpuesto = new Prisma.Decimal(0);
      let total = new Prisma.Decimal(0);
      const lineas = dto.items.map((item) => {
        const si = porId.get(item.itemVentaId);
        if (!si) {
          throw new NotFoundException(
            `Línea de venta no encontrada: ${item.itemVentaId}`,
          );
        }
        const cantidad = new Prisma.Decimal(item.cantidad);
        if (cantidad.gt(si.cantidad)) {
          throw new ConflictException(
            `La cantidad devuelta supera la vendida en la línea ${si.lineNumber}`,
          );
        }
        const factor = cantidad.div(si.cantidad);
        const lineTotal = si.total.mul(factor).toDP(2);
        const lineImpuesto = si.montoImpuesto.mul(factor).toDP(2);
        subtotal = subtotal.add(lineTotal.sub(lineImpuesto));
        totalImpuesto = totalImpuesto.add(lineImpuesto);
        total = total.add(lineTotal);
        return { item, si, cantidad, lineImpuesto, lineTotal };
      });

      const refund = await tx.saleRefund.create({
        data: {
          inquilinoId,
          ventaId: dto.ventaId,
          number: dto.number,
          idempotencyKey: dto.idempotencyKey,
          estado: 'COMPLETADA',
          motivo: dto.motivo,
          subtotal,
          totalImpuesto,
          total,
          solicitadoPorId: identidadUsuarioId,
          completadoEn: new Date(),
        },
        select: { id: true, number: true, estado: true },
      });

      for (const l of lineas) {
        const restock = l.item.restock ?? true;
        await tx.saleRefundItem.create({
          data: {
            inquilinoId,
            devolucionVentaId: refund.id,
            ventaId: dto.ventaId,
            itemVentaId: l.si.id,
            cantidad: l.cantidad,
            unitAmount: l.si.precioUnitario,
            montoImpuesto: l.lineImpuesto,
            total: l.lineTotal,
            restock,
          },
        });
        if (restock && l.si.variant?.isStockTracked && l.si.varianteId) {
          await this.reingresarStock(
            tx,
            inquilinoId,
            l.item.almacenId,
            refund.id,
            l.si.varianteId,
            l.cantidad,
          );
        }
      }

      if (dto.devolverEfectivo && dto.sesionCajaId) {
        await tx.cashMovement.create({
          data: {
            inquilinoId,
            sesionCajaId: dto.sesionCajaId,
            idempotencyKey: `${dto.idempotencyKey}:caja`,
            tipo: 'DEVOLUCION_EFECTIVO',
            monto: total,
            moneda: venta.moneda,
            referenciaType: 'DEVOLUCION_VENTA',
            referenciaId: refund.id,
            actorId: identidadUsuarioId,
          },
        });
      }

      return { ...refund, total: total.toFixed(2), idempotente: false };
    });
  }

  /** Reingresa stock por una devolución: bloquea el balance y contabiliza. */
  private async reingresarStock(
    tx: TxPrisma,
    inquilinoId: string,
    almacenId: string,
    refundId: string,
    varianteId: string,
    cantidad: Prisma.Decimal,
  ): Promise<void> {
    const balances = await tx.$queryRaw<
      { id: string; costoPromedio: Prisma.Decimal }[]
    >`SELECT "id", "costoPromedio" FROM "StockBalance"
      WHERE "inquilinoId" = ${inquilinoId}::uuid
        AND "almacenId" = ${almacenId}::uuid
        AND "varianteId" = ${varianteId}::uuid
      FOR UPDATE`;

    let costo = new Prisma.Decimal(0);
    if (balances.length === 0) {
      await tx.stockBalance.create({
        data: {
          inquilinoId,
          almacenId,
          varianteId,
          enStock: cantidad,
          available: cantidad,
        },
      });
    } else {
      costo = new Prisma.Decimal(balances[0].costoPromedio);
      await tx.stockBalance.update({
        where: { id: balances[0].id },
        data: {
          enStock: { increment: cantidad },
          available: { increment: cantidad },
          version: { increment: 1 },
        },
      });
    }

    await tx.inventoryLedgerEntry.create({
      data: {
        inquilinoId,
        almacenId,
        varianteId,
        movementType: 'DEVOLUCION_VENTA',
        cantidad,
        costoUnitario: costo,
        totalCost: costo.mul(cantidad),
        referenciaType: 'DEVOLUCION_VENTA',
        referenciaId: refundId,
        idempotencyKey: `${refundId}:${almacenId}:${varianteId}`,
        occurredAt: new Date(),
      },
    });
  }

  private async calcularLineas(
    tx: TxPrisma,
    inquilinoId: string,
    dto: CrearVentaDto,
  ): Promise<LineaCalculada[]> {
    const variantes = await tx.productVariant.findMany({
      where: {
        inquilinoId,
        id: { in: [...new Set(dto.items.map((item) => item.varianteId))] },
        estado: 'ACTIVO',
        product: { estado: 'ACTIVO' },
      },
      include: {
        unitOfMeasure: { select: { sunatCode: true } },
        taxes: {
          where: { tax: { estado: 'ACTIVO' } },
          include: { tax: true },
          orderBy: { isPrimary: 'desc' },
        },
      },
    });
    const porId = new Map(variantes.map((variante) => [variante.id, variante]));

    // Secuencial: comparten una sola conexión pg dentro de la transacción;
    // en paralelo dispararía el DeprecationWarning de pg.
    const lineas: LineaCalculada[] = [];
    for (const [indice, item] of dto.items.entries()) {
      const variante = porId.get(item.varianteId);
      if (!variante) {
        throw new NotFoundException(
          `Variante no encontrada o inactiva: ${item.varianteId}`,
        );
      }
      const cantidad = new Prisma.Decimal(item.cantidad);
      const precio = await tx.priceListItem.findFirst({
          where: {
            inquilinoId,
            varianteId: variante.id,
            minQuantity: { lte: cantidad },
            AND: [
              { OR: [{ iniciaEn: null }, { iniciaEn: { lte: new Date() } }] },
              { OR: [{ terminaEn: null }, { terminaEn: { gt: new Date() } }] },
            ],
            priceList: {
              inquilinoId,
              empresaId: dto.empresaId,
              moneda: dto.moneda,
              estado: 'ACTIVO',
              isDefault: true,
              AND: [
                { OR: [{ iniciaEn: null }, { iniciaEn: { lte: new Date() } }] },
                {
                  OR: [{ terminaEn: null }, { terminaEn: { gt: new Date() } }],
                },
              ],
            },
          },
          orderBy: { minQuantity: 'desc' },
          select: { monto: true },
        });
        if (!precio) {
          throw new ConflictException(
            `No existe un precio vigente para ${variante.sku}`,
          );
        }
        const precioUnitario = precio.monto;
        const montoBruto = cantidad.mul(precioUnitario);
        const impuestoPrincipal = variante.taxes[0]?.tax;
        const tasa = impuestoPrincipal
          ? impuestoPrincipal.rate
          : new Prisma.Decimal(0);
        const montoImpuesto = impuestoPrincipal?.includedInPrice
          ? montoBruto.mul(tasa).div(new Prisma.Decimal(100).add(tasa))
          : montoBruto.mul(tasa).div(100);
        const total = impuestoPrincipal?.includedInPrice
          ? montoBruto
          : montoBruto.add(montoImpuesto);
        lineas.push({
          item,
          lineNumber: indice + 1,
          sku: variante.sku,
          nombre: variante.nombre,
          unidad: variante.unitOfMeasure.sunatCode,
          afectacionImpuesto: impuestoPrincipal?.affectation ?? 'INAFECTO',
          isStockTracked: variante.isStockTracked,
          allowNegativeStock: variante.allowNegativeStock,
          cantidad,
          precioUnitario,
          montoBruto,
          montoImpuesto,
          total,
        });
    }
    return lineas;
  }

  private resolverEstado(
    total: Prisma.Decimal,
    totalPagado: Prisma.Decimal,
  ): 'PENDIENTE_PAGO' | 'PAGADA_PARCIALMENTE' | 'PAGADA' {
    if (totalPagado.gte(total) && total.gt(0)) {
      return 'PAGADA';
    }
    if (totalPagado.gt(0)) {
      return 'PAGADA_PARCIALMENTE';
    }
    return 'PENDIENTE_PAGO';
  }

  /**
   * Reserves the next correlative from DocumentSeries under a row lock so
   * concurrent sales never receive the same number or leave gaps.
   */
  private async reservarCorrelativo(
    tx: TxPrisma,
    inquilinoId: string,
    serieId: string,
  ): Promise<CorrelativoReservado> {
    const filas = await tx.$queryRaw<
      { series: string; nextNumber: bigint }[]
    >`SELECT "series", "nextNumber" FROM "DocumentSeries"
      WHERE "id" = ${serieId}::uuid AND "inquilinoId" = ${inquilinoId}::uuid AND "estado" = 'ACTIVO'
      FOR UPDATE`;

    if (filas.length === 0) {
      throw new NotFoundException(
        'Serie de documento no encontrada o inactiva',
      );
    }

    const { series, nextNumber } = filas[0];
    await tx.$executeRaw`UPDATE "DocumentSeries"
      SET "nextNumber" = "nextNumber" + 1, "actualizadoEn" = now()
      WHERE "id" = ${serieId}::uuid AND "inquilinoId" = ${inquilinoId}::uuid`;

    const correlativo = nextNumber.toString().padStart(8, '0');
    return { numeroFormateado: `${series}-${correlativo}` };
  }

  private async registrarLinea(
    tx: TxPrisma,
    inquilinoId: string,
    ventaId: string,
    linea: LineaCalculada,
  ): Promise<void> {
    const { item } = linea;

    await tx.saleItem.create({
      data: {
        inquilinoId,
        ventaId,
        varianteId: item.varianteId,
        lineNumber: linea.lineNumber,
        skuSnapshot: linea.sku,
        nombreSnapshot: linea.nombre,
        unitCodeSnapshot: linea.unidad,
        AfectacionImpuesto: linea.afectacionImpuesto,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        valorUnitario: linea.precioUnitario.sub(
          linea.montoImpuesto.div(linea.cantidad),
        ),
        montoBruto: linea.montoBruto,
        montoImpuesto: linea.montoImpuesto,
        total: linea.total,
      },
    });

    if (!linea.isStockTracked) return;

    // Lock the stock row, verify availability, then decrement with an
    // optimistic version bump. The FOR UPDATE lock serializes concurrent
    // sales of the same variant/warehouse.
    const balances = await tx.$queryRaw<
      {
        id: string;
        available: Prisma.Decimal;
        version: number;
        costoPromedio: Prisma.Decimal;
      }[]
    >`SELECT "id", "available", "version", "costoPromedio" FROM "StockBalance"
      WHERE "inquilinoId" = ${inquilinoId}::uuid
        AND "almacenId" = ${item.almacenId}::uuid
        AND "varianteId" = ${item.varianteId}::uuid
      FOR UPDATE`;

    if (balances.length === 0 && !linea.allowNegativeStock) {
      throw new ConflictException(
        `Sin stock registrado para la variante ${item.varianteId} en el almacén ${item.almacenId}`,
      );
    }

    if (balances.length === 0) {
      await tx.stockBalance.create({
        data: {
          inquilinoId,
          almacenId: item.almacenId,
          varianteId: item.varianteId,
          enStock: linea.cantidad.negated(),
          available: linea.cantidad.negated(),
        },
      });
      await this.registrarAsientoVenta(
        tx,
        inquilinoId,
        ventaId,
        linea,
        new Prisma.Decimal(0),
      );
      return;
    }
    const balance = balances[0];
    const disponible = new Prisma.Decimal(balance.available);
    if (disponible.lt(linea.cantidad) && !linea.allowNegativeStock) {
      throw new ConflictException(
        `Stock insuficiente: disponible ${disponible.toString()}, requerido ${linea.cantidad.toString()}`,
      );
    }

    await tx.stockBalance.update({
      where: { id: balance.id },
      data: {
        enStock: { decrement: linea.cantidad },
        available: { decrement: linea.cantidad },
        version: { increment: 1 },
      },
    });

    await this.registrarAsientoVenta(
      tx,
      inquilinoId,
      ventaId,
      linea,
      new Prisma.Decimal(balance.costoPromedio),
    );
  }

  private async registrarAsientoVenta(
    tx: TxPrisma,
    inquilinoId: string,
    ventaId: string,
    linea: LineaCalculada,
    costoUnitario: Prisma.Decimal,
  ) {
    await tx.inventoryLedgerEntry.create({
      data: {
        inquilinoId,
        almacenId: linea.item.almacenId,
        varianteId: linea.item.varianteId,
        movementType: 'VENTA',
        // Outbound movement stored negative so the ledger sums to on-hand.
        cantidad: linea.cantidad.negated(),
        costoUnitario,
        totalCost: costoUnitario.mul(linea.cantidad).negated(),
        referenciaType: 'VENTA',
        referenciaId: ventaId,
        idempotencyKey: `${ventaId}:${linea.item.almacenId}:${linea.item.varianteId}:${linea.lineNumber}`,
        occurredAt: new Date(),
      },
    });
  }

  private async exigirContextoComercial(
    tx: TxPrisma,
    inquilinoId: string,
    dto: CrearVentaDto,
  ) {
    const requiereCaja = (dto.pagos ?? []).some(
      (pago) => pago.method === MetodoPagoDto.EFECTIVO,
    );
    if (requiereCaja && !dto.sesionCajaId) {
      throw new ConflictException(
        'Una venta en efectivo requiere una sesión de caja',
      );
    }
    // Secuencial: comparten una sola conexión pg dentro de la transacción.
    const empresa = await tx.company.findFirst({
      where: { id: dto.empresaId, inquilinoId, estado: 'ACTIVO' },
      select: { id: true },
    });
    const sucursal = await tx.branch.findFirst({
      where: {
        id: dto.sucursalId,
        empresaId: dto.empresaId,
        inquilinoId,
        estado: 'ACTIVO',
      },
      select: { id: true },
    });
    const cliente = dto.clienteId
      ? await tx.customer.findFirst({
          where: { id: dto.clienteId, inquilinoId, estado: 'ACTIVO' },
          select: { id: true },
        })
      : true;
    const sesion = dto.sesionCajaId
      ? await tx.cashSession.findFirst({
          where: {
            id: dto.sesionCajaId,
            inquilinoId,
            sucursalId: dto.sucursalId,
            estado: 'ABIERTA',
          },
          select: { id: true },
        })
      : true;
    if (!empresa || !sucursal || !cliente || !sesion) {
      throw new NotFoundException(
        'Empresa, sucursal, cliente o sesión de caja no válida para la venta',
      );
    }
  }
}
