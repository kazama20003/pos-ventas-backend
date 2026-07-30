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

    return Promise.all(
      dto.items.map(async (item, indice) => {
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
        return {
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
        };
      }),
    );
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
    const [empresa, sucursal, cliente, sesion] = await Promise.all([
      tx.company.findFirst({
        where: { id: dto.empresaId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      }),
      tx.branch.findFirst({
        where: {
          id: dto.sucursalId,
          empresaId: dto.empresaId,
          inquilinoId,
          estado: 'ACTIVO',
        },
        select: { id: true },
      }),
      dto.clienteId
        ? tx.customer.findFirst({
            where: { id: dto.clienteId, inquilinoId, estado: 'ACTIVO' },
            select: { id: true },
          })
        : Promise.resolve(true),
      dto.sesionCajaId
        ? tx.cashSession.findFirst({
            where: {
              id: dto.sesionCajaId,
              inquilinoId,
              sucursalId: dto.sucursalId,
              estado: 'ABIERTA',
            },
            select: { id: true },
          })
        : Promise.resolve(true),
    ]);
    if (!empresa || !sucursal || !cliente || !sesion) {
      throw new NotFoundException(
        'Empresa, sucursal, cliente o sesión de caja no válida para la venta',
      );
    }
  }
}
