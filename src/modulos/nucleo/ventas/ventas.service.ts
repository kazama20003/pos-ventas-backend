import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CrearVentaDto, ItemVentaDto } from './dto/crear-venta.dto';

type TxPrisma = Prisma.TransactionClient;

interface CorrelativoReservado {
  numeroFormateado: string;
}

interface LineaCalculada {
  item: ItemVentaDto;
  lineNumber: number;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  montoBruto: Prisma.Decimal;
  total: Prisma.Decimal;
}

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crear(dto: CrearVentaDto) {
    const { inquilinoId, identidadUsuarioId } = this.contexto.obtenerObligatorio();

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

      const lineas = this.calcularLineas(dto.items);
      const subtotal = lineas.reduce(
        (acc, l) => acc.add(l.montoBruto),
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

      const venta = await tx.sale.create({
        data: {
          inquilinoId,
          empresaId: dto.empresaId,
          sucursalId: dto.sucursalId,
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
          totalImpuesto: new Prisma.Decimal(0),
          total,
          totalPagado,
          completadoEn: estado === 'PAGADA' ? new Date() : null,
        },
        select: { id: true },
      });

      for (const linea of lineas) {
        await this.registrarLinea(tx, inquilinoId, venta.id, linea);
      }

      for (const pago of dto.pagos ?? []) {
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

  private calcularLineas(items: ItemVentaDto[]): LineaCalculada[] {
    return items.map((item, indice) => {
      const cantidad = new Prisma.Decimal(item.cantidad);
      const precioUnitario = new Prisma.Decimal(item.precioUnitario);
      const montoBruto = cantidad.mul(precioUnitario);
      // Tax engine is deferred (Bloque fiscal): treat price as final, tax 0.
      return {
        item,
        lineNumber: indice + 1,
        cantidad,
        precioUnitario,
        montoBruto,
        total: montoBruto,
      };
    });
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
      throw new NotFoundException('Serie de documento no encontrada o inactiva');
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
        skuSnapshot: item.sku ?? null,
        nombreSnapshot: item.nombre,
        AfectacionImpuesto: item.afectacionImpuesto,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        valorUnitario: linea.precioUnitario,
        montoBruto: linea.montoBruto,
        montoImpuesto: new Prisma.Decimal(0),
        total: linea.total,
      },
    });

    // Lock the stock row, verify availability, then decrement with an
    // optimistic version bump. The FOR UPDATE lock serializes concurrent
    // sales of the same variant/warehouse.
    const balances = await tx.$queryRaw<
      { id: string; available: Prisma.Decimal; version: number; costoPromedio: Prisma.Decimal }[]
    >`SELECT "id", "available", "version", "costoPromedio" FROM "StockBalance"
      WHERE "inquilinoId" = ${inquilinoId}::uuid
        AND "almacenId" = ${item.almacenId}::uuid
        AND "varianteId" = ${item.varianteId}::uuid
      FOR UPDATE`;

    if (balances.length === 0) {
      throw new ConflictException(
        `Sin stock registrado para la variante ${item.varianteId} en el almacén ${item.almacenId}`,
      );
    }

    const balance = balances[0];
    const disponible = new Prisma.Decimal(balance.available);
    if (disponible.lt(linea.cantidad)) {
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

    const costoUnitario = new Prisma.Decimal(balance.costoPromedio);
    await tx.inventoryLedgerEntry.create({
      data: {
        inquilinoId,
        almacenId: item.almacenId,
        varianteId: item.varianteId,
        movementType: 'VENTA',
        // Outbound movement stored negative so the ledger sums to on-hand.
        cantidad: linea.cantidad.negated(),
        costoUnitario,
        totalCost: costoUnitario.mul(linea.cantidad).negated(),
        referenciaType: 'VENTA',
        referenciaId: ventaId,
        idempotencyKey: `${ventaId}:${item.almacenId}:${item.varianteId}:${linea.lineNumber}`,
        occurredAt: new Date(),
      },
    });
  }
}
