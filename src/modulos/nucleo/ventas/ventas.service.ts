import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { AutorizacionSucursalService } from '../identidad/autorizacion-sucursal.service';
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
  /** Almacén resuelto (línea o predeterminado de la sucursal). */
  almacenId: string;
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
  /** Tributos de monto fijo (ej. ICBPER S/0.50/bolsa), sumados sobre el precio. */
  montoOtrosTributos: Prisma.Decimal;
  /** El impuesto principal ya está contenido en precioUnitario (IGV incluido). */
  impuestoIncluido: boolean;
  total: Prisma.Decimal;
}

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly autorizacion: AutorizacionSucursalService,
  ) {}

  /**
   * Contexto que el POS necesita para vender en una sucursal: empresa, moneda,
   * series de comprobante activas y si hay una lista de precios por defecto.
   */
  async contextoPos(sucursalId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    await this.autorizacion.exigirEnSucursal('ventas.crear', sucursalId);
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const suc = await tx.branch.findFirst({
        where: { id: sucursalId, inquilinoId },
        select: {
          empresaId: true,
          company: { select: { moneda: true } },
        },
      });
      if (!suc) throw new NotFoundException('Sucursal no encontrada');
      const series = await tx.documentSeries.findMany({
        where: { inquilinoId, empresaId: suc.empresaId, estado: 'ACTIVO' },
        select: { id: true, documentType: true, series: true },
        orderBy: { series: 'asc' },
      });
      const listaDefault = await tx.priceList.findFirst({
        where: {
          inquilinoId,
          empresaId: suc.empresaId,
          isDefault: true,
          estado: 'ACTIVO',
        },
        select: { id: true },
      });
      return {
        empresaId: suc.empresaId,
        moneda: suc.company?.moneda ?? 'PEN',
        series,
        tienePrecios: listaDefault != null,
      };
    });
  }

  async crear(dto: CrearVentaDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    // Alcance por sucursal: solo puede vender en sucursales permitidas.
    await this.autorizacion.exigirEnSucursal('ventas.crear', dto.sucursalId);

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
      const otrosTributos = lineas.reduce(
        (acc, l) => acc.add(l.montoOtrosTributos),
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
          otrosTributos,
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
            idempotencyKey: `${dto.idempotencyKey}:pago:${indice}`,
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
        totalImpuesto: totalImpuesto.toFixed(2),
        otrosTributos: otrosTributos.toFixed(2),
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
        select: {
          id: true,
          estado: true,
          moneda: true,
          sucursalId: true,
          sesionCajaId: true,
        },
      });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.estado === 'ANULADA') {
        throw new ConflictException('No se puede devolver una venta anulada');
      }
      const almacenDefault = await this.resolverAlmacen(
        tx,
        inquilinoId,
        venta.sucursalId,
        venta.sesionCajaId,
      );
      await this.exigirAlmacenesDeSucursal(
        tx,
        inquilinoId,
        venta.sucursalId,
        dto.items.map((item) => item.almacenId),
      );

      const saleItems = await tx.saleItem.findMany({
        where: {
          inquilinoId,
          ventaId: dto.ventaId,
          id: { in: dto.items.map((i) => i.itemVentaId) },
        },
        include: { variant: { select: { isStockTracked: true } } },
      });
      const porId = new Map(saleItems.map((si) => [si.id, si]));

      // Cantidades ya devueltas por línea en devoluciones vigentes (no
      // rechazadas ni canceladas): el tope es lo vendido MENOS lo ya devuelto,
      // si no, varias devoluciones parciales devolverían más de lo vendido.
      const devueltoPrevio = await tx.saleRefundItem.groupBy({
        by: ['itemVentaId'],
        where: {
          inquilinoId,
          ventaId: dto.ventaId,
          itemVentaId: { in: dto.items.map((i) => i.itemVentaId) },
          saleRefund: { estado: { notIn: ['RECHAZADA', 'CANCELADA'] } },
        },
        _sum: { cantidad: true },
      });
      const yaDevuelto = new Map(
        devueltoPrevio.map((g) => [
          g.itemVentaId,
          g._sum.cantidad ?? new Prisma.Decimal(0),
        ]),
      );

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
        const previo = yaDevuelto.get(item.itemVentaId) ?? new Prisma.Decimal(0);
        if (cantidad.add(previo).gt(si.cantidad)) {
          const disponible = si.cantidad.sub(previo);
          throw new ConflictException(
            `La cantidad devuelta supera lo pendiente en la línea ${si.lineNumber} (disponible: ${disponible.toFixed(2)})`,
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
          const almacenId = l.item.almacenId ?? almacenDefault;
          if (!almacenId) {
            throw new ConflictException(
              'Falta almacén para reingresar el stock: la sucursal no tiene almacén predeterminado',
            );
          }
          await this.reingresarStock(
            tx,
            inquilinoId,
            almacenId,
            refund.id,
            l.si.varianteId,
            l.cantidad,
          );
        }
      }

      if (dto.devolverEfectivo && dto.sesionCajaId) {
        // La sesión debe existir, estar ABIERTA y ser de la sucursal de la
        // venta; si no, el efectivo saldría de una caja cerrada o ajena.
        const sesion = await tx.cashSession.findFirst({
          where: {
            id: dto.sesionCajaId,
            inquilinoId,
            sucursalId: venta.sucursalId,
            estado: 'ABIERTA',
          },
          select: { id: true },
        });
        if (!sesion) {
          throw new ConflictException(
            'La sesión de caja no existe, está cerrada o no pertenece a la sucursal de la venta',
          );
        }
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

  /** Almacén predeterminado ACTIVO de una sucursal (o null si no hay). */
  private async almacenPredeterminado(
    tx: TxPrisma,
    inquilinoId: string,
    sucursalId: string,
  ): Promise<string | null> {
    const w = await tx.warehouse.findFirst({
      where: {
        inquilinoId,
        sucursalId,
        esPredeterminado: true,
        estado: 'ACTIVO',
      },
      select: { id: true },
    });
    if (w) {
      return w.id;
    }
    // Sin default marcado: si la sucursal tiene un único almacén activo,
    // úsalo (caso común, sin ambigüedad). Con varios exige elección explícita.
    const activos = await tx.warehouse.findMany({
      where: { inquilinoId, sucursalId, estado: 'ACTIVO' },
      select: { id: true },
      take: 2,
    });
    return activos.length === 1 ? activos[0].id : null;
  }

  /**
   * Resuelve el almacén de origen del stock para una venta/devolución.
   * Prioridad: almacén de la caja de la sesión → predeterminado de la
   * sucursal → único almacén activo. La caja manda porque es el punto físico
   * desde el que se despacha; así una sucursal con varios almacenes no exige
   * marcar default ni mandar `almacenId` por línea.
   */
  private async resolverAlmacen(
    tx: TxPrisma,
    inquilinoId: string,
    sucursalId: string,
    sesionCajaId?: string | null,
  ): Promise<string | null> {
    if (sesionCajaId) {
      const sesion = await tx.cashSession.findFirst({
        where: { id: sesionCajaId, inquilinoId },
        select: {
          cashRegister: {
            select: {
              almacen: {
                select: { id: true, sucursalId: true, estado: true },
              },
            },
          },
        },
      });
      const almacen = sesion?.cashRegister?.almacen;
      if (
        almacen &&
        almacen.estado === 'ACTIVO' &&
        almacen.sucursalId === sucursalId
      ) {
        return almacen.id;
      }
    }
    return this.almacenPredeterminado(tx, inquilinoId, sucursalId);
  }

  /**
   * Verifica que cada almacén explícito de línea pertenezca a la sucursal y
   * esté activo. Ignora los `null/undefined` (esos resuelven al default).
   */
  private async exigirAlmacenesDeSucursal(
    tx: TxPrisma,
    inquilinoId: string,
    sucursalId: string,
    almacenIds: (string | undefined)[],
  ): Promise<void> {
    const pedidos = [...new Set(almacenIds.filter((a): a is string => !!a))];
    if (pedidos.length === 0) return;
    const validos = await tx.warehouse.findMany({
      where: {
        inquilinoId,
        sucursalId,
        estado: 'ACTIVO',
        id: { in: pedidos },
      },
      select: { id: true },
    });
    const ok = new Set(validos.map((w) => w.id));
    const invalido = pedidos.find((a) => !ok.has(a));
    if (invalido) {
      throw new ConflictException(
        `El almacén ${invalido} no pertenece a la sucursal o está archivado`,
      );
    }
  }

  private async calcularLineas(
    tx: TxPrisma,
    inquilinoId: string,
    dto: CrearVentaDto,
  ): Promise<LineaCalculada[]> {
    // Almacén de relleno cuando la línea no trae uno: caja → default sucursal.
    const almacenDefault = await this.resolverAlmacen(
      tx,
      inquilinoId,
      dto.sucursalId,
      dto.sesionCajaId,
    );
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

    // Un almacén explícito por línea debe pertenecer a la sucursal de la venta
    // y estar activo; si no, la venta descontaría stock de otra sucursal.
    await this.exigirAlmacenesDeSucursal(
      tx,
      inquilinoId,
      dto.sucursalId,
      dto.items.map((item) => item.almacenId),
    );

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
      // Solo las variantes con stock necesitan almacén; resolver línea o default.
      let almacenId = '';
      if (variante.isStockTracked) {
        almacenId = item.almacenId ?? almacenDefault ?? '';
        if (!almacenId) {
          throw new ConflictException(
            `Falta almacén para ${variante.sku}: la sucursal no tiene almacén predeterminado`,
          );
        }
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
      const tributos = variante.taxes.map((t) => t.tax);
      // IGV (u otro tributo porcentual): define afectación y monto de impuesto.
      const impuestoPrincipal = tributos.find(
        (t) => (t.tipoCalculo ?? 'PORCENTAJE') === 'PORCENTAJE',
      );
      const tasa = impuestoPrincipal
        ? impuestoPrincipal.rate
        : new Prisma.Decimal(0);
      const montoImpuesto = impuestoPrincipal?.includedInPrice
        ? montoBruto.mul(tasa).div(new Prisma.Decimal(100).add(tasa))
        : montoBruto.mul(tasa).div(100);
      // Tributos de monto fijo por unidad (ICBPER): se suman siempre sobre el precio.
      const montoOtrosTributos = tributos
        .filter((t) => t.tipoCalculo === 'MONTO_FIJO')
        .reduce(
          (acc, t) => acc.add(t.rate.mul(cantidad)),
          new Prisma.Decimal(0),
        );
      const totalPrecio = impuestoPrincipal?.includedInPrice
        ? montoBruto
        : montoBruto.add(montoImpuesto);
      const total = totalPrecio.add(montoOtrosTributos);
      lineas.push({
        item,
        almacenId,
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
        montoOtrosTributos,
        impuestoIncluido: !!impuestoPrincipal?.includedInPrice,
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
        // Valor unitario = precio sin el IGV. Solo se resta el impuesto cuando
        // venía incluido en el precio; si no, el precio ya ES el valor.
        valorUnitario: linea.impuestoIncluido
          ? linea.precioUnitario.sub(linea.montoImpuesto.div(linea.cantidad))
          : linea.precioUnitario,
        montoBruto: linea.montoBruto,
        montoImpuesto: linea.montoImpuesto,
        montoOtrosTributos: linea.montoOtrosTributos,
        total: linea.total,
      },
    });

    if (!linea.isStockTracked) return;

    const almacenId = linea.almacenId;

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
        AND "almacenId" = ${almacenId}::uuid
        AND "varianteId" = ${item.varianteId}::uuid
      FOR UPDATE`;

    if (balances.length === 0 && !linea.allowNegativeStock) {
      throw new ConflictException(
        `Sin stock registrado para la variante ${item.varianteId} en el almacén ${almacenId}`,
      );
    }

    if (balances.length === 0) {
      await tx.stockBalance.create({
        data: {
          inquilinoId,
          almacenId,
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
        almacenId: linea.almacenId,
        varianteId: linea.item.varianteId,
        movementType: 'VENTA',
        // Outbound movement stored negative so the ledger sums to on-hand.
        cantidad: linea.cantidad.negated(),
        costoUnitario,
        totalCost: costoUnitario.mul(linea.cantidad).negated(),
        referenciaType: 'VENTA',
        referenciaId: ventaId,
        idempotencyKey: `${ventaId}:${linea.almacenId}:${linea.item.varianteId}:${linea.lineNumber}`,
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
