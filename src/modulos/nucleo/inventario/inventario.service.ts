import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { AjustarStockDto, TipoAjusteStock } from './dto/ajustar-stock.dto';
import { RegistrarStockInicialDto } from './dto/registrar-stock-inicial.dto';
import {
  CrearTransferenciaDto,
  RecibirTransferenciaDto,
} from './dto/transferencia.dto';
import { DefinirNivelStockDto } from './dto/nivel-stock.dto';
import { CrearConteoDto, RegistrarConteoDto } from './dto/conteo.dto';
import { CrearReservaDto } from './dto/reserva.dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class InventarioService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async registrarStockInicial(dto: RegistrarStockInicialDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.inventoryLedgerEntry.findUnique({
        where: {
          inquilinoId_idempotencyKey: {
            inquilinoId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        select: { id: true, almacenId: true, varianteId: true, cantidad: true },
      });
      if (existente) return { ...existente, idempotente: true };

      // Secuencial a propósito: dentro de una transacción interactiva todas las
      // consultas comparten una sola conexión pg; lanzarlas en paralelo dispara
      // el DeprecationWarning "client.query() while already executing a query".
      const almacen = await tx.warehouse.findFirst({
        where: { id: dto.almacenId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      });
      const variante = await tx.productVariant.findFirst({
        where: { id: dto.varianteId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true, isStockTracked: true },
      });
      if (!almacen)
        throw new NotFoundException('Almacén no encontrado o inactivo');
      if (!variante)
        throw new NotFoundException('Variante no encontrada o inactiva');
      if (!variante.isStockTracked)
        throw new ConflictException('La variante no controla inventario');

      const balances = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "StockBalance"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "almacenId" = ${dto.almacenId}::uuid
          AND "varianteId" = ${dto.varianteId}::uuid
        FOR UPDATE`;
      if (balances.length) {
        throw new ConflictException(
          'La variante ya tiene un saldo inicial en este almacén',
        );
      }

      const cantidad = new Prisma.Decimal(dto.cantidad);
      const costoUnitario = new Prisma.Decimal(dto.costoUnitario);
      const saldo = await tx.stockBalance.create({
        data: {
          inquilinoId,
          almacenId: dto.almacenId,
          varianteId: dto.varianteId,
          enStock: cantidad,
          available: cantidad,
          costoPromedio: costoUnitario,
        },
        select: {
          id: true,
          enStock: true,
          available: true,
          costoPromedio: true,
        },
      });
      const asiento = await tx.inventoryLedgerEntry.create({
        data: {
          inquilinoId,
          almacenId: dto.almacenId,
          varianteId: dto.varianteId,
          movementType: 'APERTURA',
          cantidad,
          costoUnitario,
          totalCost: cantidad.mul(costoUnitario),
          referenciaType: 'APERTURA_INICIAL',
          referenciaId: dto.varianteId,
          idempotencyKey: dto.idempotencyKey,
          occurredAt: new Date(),
        },
        select: { id: true },
      });
      return { ...saldo, asientoId: asiento.id, idempotente: false };
    });
  }

  /**
   * Ajuste manual de stock (entrada/salida: recepción suelta, merma, conteo).
   * Actualiza el saldo y deja un asiento inmutable con el motivo.
   */
  async ajustarStock(dto: AjustarStockDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const almacen = await tx.warehouse.findFirst({
        where: { id: dto.almacenId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      });
      if (!almacen)
        throw new NotFoundException('Almacén no encontrado o inactivo');
      const variante = await tx.productVariant.findFirst({
        where: { id: dto.varianteId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true, isStockTracked: true, allowNegativeStock: true },
      });
      if (!variante)
        throw new NotFoundException('Variante no encontrada o inactiva');
      if (!variante.isStockTracked)
        throw new ConflictException('La variante no controla inventario');

      // Idempotencia: con clave del cliente, un reintento no re-aplica el
      // ajuste; devuelve el saldo actual. Sin clave, se cae al comportamiento
      // previo (no idempotente) usando un sufijo único.
      const idempotencyKey = dto.idempotencyKey
        ? `ajuste:${dto.idempotencyKey}`
        : `ajuste:${dto.varianteId}:${dto.almacenId}:${randomUUID()}`;
      if (dto.idempotencyKey) {
        const previo = await tx.inventoryLedgerEntry.findUnique({
          where: {
            inquilinoId_idempotencyKey: { inquilinoId, idempotencyKey },
          },
          select: { id: true },
        });
        if (previo) {
          const saldoActual = await tx.stockBalance.findFirst({
            where: {
              inquilinoId,
              almacenId: dto.almacenId,
              varianteId: dto.varianteId,
            },
            select: {
              id: true,
              enStock: true,
              available: true,
              costoPromedio: true,
            },
          });
          return { ...saldoActual, asientoId: previo.id, idempotente: true };
        }
      }

      const esEntrada = dto.tipo === TipoAjusteStock.ENTRADA;
      const cantidad = new Prisma.Decimal(dto.cantidad);

      // Bloqueo pesimista del saldo (si existe).
      const lock = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "StockBalance"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "almacenId" = ${dto.almacenId}::uuid
          AND "varianteId" = ${dto.varianteId}::uuid
        FOR UPDATE`;
      const saldo = lock.length
        ? await tx.stockBalance.findUnique({ where: { id: lock[0].id } })
        : null;

      // Sin saldo previo: solo tiene sentido una entrada (crea el saldo).
      if (!saldo) {
        if (!esEntrada)
          throw new ConflictException('No hay stock para descontar');
        const costo = new Prisma.Decimal(dto.costoUnitario ?? 0);
        const nuevo = await tx.stockBalance.create({
          data: {
            inquilinoId,
            almacenId: dto.almacenId,
            varianteId: dto.varianteId,
            enStock: cantidad,
            available: cantidad,
            costoPromedio: costo,
          },
          select: {
            id: true,
            enStock: true,
            available: true,
            costoPromedio: true,
          },
        });
        const asiento = await this.crearAsientoAjuste(
          tx,
          inquilinoId,
          dto,
          cantidad,
          costo,
          esEntrada,
          idempotencyKey,
        );
        return { ...nuevo, asientoId: asiento };
      }

      const enStock = new Prisma.Decimal(saldo.enStock);
      const reserved = new Prisma.Decimal(saldo.reserved);
      const avg = new Prisma.Decimal(saldo.costoPromedio);
      const nuevoStock = esEntrada
        ? enStock.add(cantidad)
        : enStock.sub(cantidad);
      if (nuevoStock.lt(0) && !variante.allowNegativeStock)
        throw new ConflictException(
          'Stock insuficiente para el ajuste (no se permite negativo)',
        );

      // Costo promedio ponderado solo en entradas con costo indicado.
      let nuevoAvg = avg;
      let costoMovimiento = avg;
      if (esEntrada && dto.costoUnitario !== undefined) {
        const costo = new Prisma.Decimal(dto.costoUnitario);
        costoMovimiento = costo;
        const den = enStock.add(cantidad);
        nuevoAvg = den.gt(0)
          ? enStock.mul(avg).add(cantidad.mul(costo)).div(den)
          : costo;
      }

      const actualizado = await tx.stockBalance.update({
        where: { id: saldo.id },
        data: {
          enStock: nuevoStock,
          available: nuevoStock.sub(reserved),
          costoPromedio: nuevoAvg,
          version: { increment: 1 },
        },
        select: {
          id: true,
          enStock: true,
          available: true,
          costoPromedio: true,
        },
      });
      const asiento = await this.crearAsientoAjuste(
        tx,
        inquilinoId,
        dto,
        cantidad,
        costoMovimiento,
        esEntrada,
        idempotencyKey,
      );
      return { ...actualizado, asientoId: asiento };
    });
  }

  private async crearAsientoAjuste(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    dto: AjustarStockDto,
    cantidad: Prisma.Decimal,
    costoUnitario: Prisma.Decimal,
    esEntrada: boolean,
    idempotencyKey: string,
  ): Promise<string> {
    const asiento = await tx.inventoryLedgerEntry.create({
      data: {
        inquilinoId,
        almacenId: dto.almacenId,
        varianteId: dto.varianteId,
        movementType: esEntrada ? 'AJUSTE_ENTRADA' : 'AJUSTE_SALIDA',
        cantidad,
        costoUnitario,
        totalCost: cantidad.mul(costoUnitario),
        referenciaType: 'AJUSTE_MANUAL',
        referenciaId: dto.varianteId,
        idempotencyKey,
        notas: dto.motivo?.trim() || null,
        occurredAt: new Date(),
      },
      select: { id: true },
    });
    return asiento.id;
  }

  /** Kardex: historial de movimientos de una variante (más reciente primero). */
  async kardex(varianteId: string, almacenId?: string, limit = 50) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const variante = await tx.productVariant.findFirst({
        where: { id: varianteId, inquilinoId },
        select: { id: true },
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');
      return tx.inventoryLedgerEntry.findMany({
        where: {
          inquilinoId,
          varianteId,
          ...(almacenId ? { almacenId } : {}),
        },
        include: {
          warehouse: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 200),
      });
    });
  }

  /**
   * Stock consolidado por almacén/sucursal con valorizado (stock × costo
   * promedio). Devuelve filas paginadas, totales del filtro y un resumen
   * agregado por almacén.
   */
  async consolidadoStock(filtros: {
    almacenId?: string;
    sucursalId?: string;
    q?: string;
    soloConStock?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const page = Math.max(filtros.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filtros.pageSize ?? 50, 1), 200);
    const CAP = 5000;
    const q = filtros.q?.trim();

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const where: Prisma.StockBalanceWhereInput = {
        inquilinoId,
        ...(filtros.almacenId ? { almacenId: filtros.almacenId } : {}),
        ...(filtros.sucursalId
          ? { warehouse: { sucursalId: filtros.sucursalId } }
          : {}),
        ...(filtros.soloConStock ? { enStock: { gt: 0 } } : {}),
        variant: {
          estado: 'ACTIVO',
          ...(q
            ? {
                OR: [
                  { sku: { contains: q, mode: 'insensitive' } },
                  { nombre: { contains: q, mode: 'insensitive' } },
                  { product: { nombre: { contains: q, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
      };

      const filas = await tx.stockBalance.findMany({
        where,
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              nombre: true,
              product: { select: { nombre: true } },
            },
          },
          warehouse: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              sucursalId: true,
              branch: { select: { nombre: true } },
            },
          },
        },
        take: CAP,
      });

      const mapeadas = filas.map((f) => {
        const enStock = new Prisma.Decimal(f.enStock);
        const costo = new Prisma.Decimal(f.costoPromedio);
        const valor = enStock.mul(costo);
        const available = new Prisma.Decimal(f.available);
        const minimo = new Prisma.Decimal(f.stockMinimo);
        const bajoMinimo = minimo.gt(0) && available.lte(minimo);
        return {
          varianteId: f.varianteId,
          sku: f.variant.sku,
          nombre: f.variant.nombre,
          productoNombre: f.variant.product?.nombre ?? null,
          almacenId: f.almacenId,
          almacenCodigo: f.warehouse.codigo,
          almacenNombre: f.warehouse.nombre,
          sucursalId: f.warehouse.sucursalId,
          sucursalNombre: f.warehouse.branch?.nombre ?? null,
          enStock: enStock.toString(),
          reserved: new Prisma.Decimal(f.reserved).toString(),
          enTransito: new Prisma.Decimal(f.enTransito).toString(),
          available: available.toString(),
          costoPromedio: costo.toString(),
          valor: valor.toString(),
          stockMinimo: minimo.toString(),
          stockMaximo: new Prisma.Decimal(f.stockMaximo).toString(),
          bajoMinimo,
        };
      });

      // Orden: mayor valor primero (lo más relevante para valorizado).
      mapeadas.sort((a, b) =>
        new Prisma.Decimal(b.valor).cmp(new Prisma.Decimal(a.valor)),
      );

      // Totales del filtro completo.
      let unidades = new Prisma.Decimal(0);
      let valorTotal = new Prisma.Decimal(0);
      const almacenesSet = new Set<string>();
      const variantesSet = new Set<string>();
      const porAlmacen = new Map<
        string,
        {
          almacenId: string;
          almacenNombre: string;
          sucursalNombre: string | null;
          variantes: number;
          unidades: Prisma.Decimal;
          valor: Prisma.Decimal;
        }
      >();
      for (const m of mapeadas) {
        unidades = unidades.add(m.enStock);
        valorTotal = valorTotal.add(m.valor);
        almacenesSet.add(m.almacenId);
        variantesSet.add(m.varianteId);
        const acc = porAlmacen.get(m.almacenId) ?? {
          almacenId: m.almacenId,
          almacenNombre: m.almacenNombre,
          sucursalNombre: m.sucursalNombre,
          variantes: 0,
          unidades: new Prisma.Decimal(0),
          valor: new Prisma.Decimal(0),
        };
        acc.variantes += 1;
        acc.unidades = acc.unidades.add(m.enStock);
        acc.valor = acc.valor.add(m.valor);
        porAlmacen.set(m.almacenId, acc);
      }

      const resumenPorAlmacen = Array.from(porAlmacen.values())
        .map((a) => ({
          almacenId: a.almacenId,
          almacenNombre: a.almacenNombre,
          sucursalNombre: a.sucursalNombre,
          variantes: a.variantes,
          unidades: a.unidades.toString(),
          valor: a.valor.toString(),
        }))
        .sort((a, b) =>
          new Prisma.Decimal(b.valor).cmp(new Prisma.Decimal(a.valor)),
        );

      const total = mapeadas.length;
      const inicio = (page - 1) * pageSize;
      const items = mapeadas.slice(inicio, inicio + pageSize);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        truncado: total >= CAP,
        totales: {
          unidades: unidades.toString(),
          valor: valorTotal.toString(),
          almacenes: almacenesSet.size,
          variantes: variantesSet.size,
        },
        resumenPorAlmacen,
      };
    });
  }

  /**
   * Define el punto de reorden (mínimo) y nivel objetivo (máximo) de una
   * variante en un almacén. Crea el saldo en 0 si aún no existe.
   */
  async definirNivelStock(dto: DefinirNivelStockDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const minimo = new Prisma.Decimal(dto.stockMinimo);
    const maximo = new Prisma.Decimal(dto.stockMaximo ?? 0);
    if (maximo.gt(0) && maximo.lt(minimo))
      throw new ConflictException(
        'El nivel objetivo (máximo) no puede ser menor al mínimo',
      );

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const almacen = await tx.warehouse.findFirst({
        where: { id: dto.almacenId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      });
      if (!almacen)
        throw new NotFoundException('Almacén no encontrado o inactivo');
      const variante = await tx.productVariant.findFirst({
        where: { id: dto.varianteId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true, isStockTracked: true },
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');
      if (!variante.isStockTracked)
        throw new ConflictException('La variante no controla inventario');

      const existente = await tx.stockBalance.findUnique({
        where: {
          inquilinoId_almacenId_varianteId: {
            inquilinoId,
            almacenId: dto.almacenId,
            varianteId: dto.varianteId,
          },
        },
        select: { id: true },
      });
      if (existente) {
        return tx.stockBalance.update({
          where: { id: existente.id },
          data: { stockMinimo: minimo, stockMaximo: maximo },
          select: { id: true, stockMinimo: true, stockMaximo: true },
        });
      }
      return tx.stockBalance.create({
        data: {
          inquilinoId,
          almacenId: dto.almacenId,
          varianteId: dto.varianteId,
          stockMinimo: minimo,
          stockMaximo: maximo,
        },
        select: { id: true, stockMinimo: true, stockMaximo: true },
      });
    });
  }

  /**
   * Ítems por reabastecer: available <= stockMinimo (con mínimo definido).
   * Devuelve la cantidad sugerida a comprar/transferir por ítem.
   */
  async alertasReabastecimiento(filtros: {
    almacenId?: string;
    sucursalId?: string;
  }) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.stockBalance.findMany({
        where: {
          inquilinoId,
          stockMinimo: { gt: 0 },
          ...(filtros.almacenId ? { almacenId: filtros.almacenId } : {}),
          ...(filtros.sucursalId
            ? { warehouse: { sucursalId: filtros.sucursalId } }
            : {}),
        },
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              nombre: true,
              product: { select: { nombre: true } },
            },
          },
          warehouse: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              sucursalId: true,
              branch: { select: { nombre: true } },
            },
          },
        },
        take: 2000,
      });

      // El query ya restringe stockMinimo > 0; filtrar los que están en/bajo mínimo.
      const items = filas
        .filter((f) =>
          new Prisma.Decimal(f.available).lte(
            new Prisma.Decimal(f.stockMinimo),
          ),
        )
        .sort((a, b) => {
          // Los más críticos primero (menor cobertura sobre el mínimo).
          const ra = new Prisma.Decimal(a.available).div(
            new Prisma.Decimal(a.stockMinimo),
          );
          const rb = new Prisma.Decimal(b.available).div(
            new Prisma.Decimal(b.stockMinimo),
          );
          return ra.cmp(rb);
        })
        .map((f) => {
          const available = new Prisma.Decimal(f.available);
          const minimo = new Prisma.Decimal(f.stockMinimo);
          const maximo = new Prisma.Decimal(f.stockMaximo);
          // Reponer hasta el objetivo; si no hay objetivo, hasta el mínimo.
          const objetivo = maximo.gt(0) ? maximo : minimo;
          const sugerido = objetivo.sub(available);
          return {
            varianteId: f.varianteId,
            sku: f.variant.sku,
            nombre: f.variant.nombre,
            productoNombre: f.variant.product?.nombre ?? null,
            almacenId: f.almacenId,
            almacenNombre: f.warehouse.nombre,
            sucursalId: f.warehouse.sucursalId,
            sucursalNombre: f.warehouse.branch?.nombre ?? null,
            available: available.toString(),
            stockMinimo: minimo.toString(),
            stockMaximo: maximo.toString(),
            sugerido: sugerido.gt(0) ? sugerido.toString() : '0',
          };
        });

      return { total: items.length, items };
    });
  }

  // ─────────────────────────────── Reservas ─────────────────────────────────

  /** Lista reservas con filtros opcionales (almacén, estado). */
  async listarReservas(filtros: {
    almacenId?: string;
    estado?: string;
    limit?: number;
  }) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.inventoryReservation.findMany({
        where: {
          inquilinoId,
          ...(filtros.almacenId ? { almacenId: filtros.almacenId } : {}),
          ...(filtros.estado ? { estado: filtros.estado as never } : {}),
        },
        include: {
          variant: { select: { id: true, sku: true, nombre: true } },
          warehouse: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
        take: Math.min(Math.max(filtros.limit ?? 100, 1), 300),
      }),
    );
  }

  /**
   * Crea una reserva: bloquea el saldo, verifica disponible y mueve
   * `cantidad` de `available` a `reserved`. La reserva no descuenta stock
   * físico; solo lo aparta hasta atenderla o liberarla.
   */
  async crearReserva(dto: CrearReservaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const variante = await tx.productVariant.findFirst({
        where: { id: dto.varianteId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true, isStockTracked: true },
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');
      if (!variante.isStockTracked)
        throw new ConflictException('La variante no controla inventario');

      const cantidad = new Prisma.Decimal(dto.cantidad);
      const lock = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "StockBalance"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "almacenId" = ${dto.almacenId}::uuid
          AND "varianteId" = ${dto.varianteId}::uuid
        FOR UPDATE`;
      const saldo = lock.length
        ? await tx.stockBalance.findUnique({ where: { id: lock[0].id } })
        : null;
      if (!saldo)
        throw new ConflictException('No hay stock para reservar en el almacén');

      const enStock = new Prisma.Decimal(saldo.enStock);
      const reserved = new Prisma.Decimal(saldo.reserved);
      const disponible = enStock.sub(reserved);
      if (disponible.lt(cantidad))
        throw new ConflictException(
          `Disponible insuficiente para reservar (disponible ${disponible.toString()})`,
        );

      const nuevoReserved = reserved.add(cantidad);
      await tx.stockBalance.update({
        where: { id: saldo.id },
        data: {
          reserved: nuevoReserved,
          available: enStock.sub(nuevoReserved),
          version: { increment: 1 },
        },
      });

      return tx.inventoryReservation.create({
        data: {
          inquilinoId,
          almacenId: dto.almacenId,
          varianteId: dto.varianteId,
          cantidad,
          estado: 'ACTIVA',
          referenciaType: dto.referencia?.trim() || 'MANUAL',
          referenciaId: randomUUID(),
          venceEn: dto.venceEn ? new Date(dto.venceEn) : null,
        },
        include: {
          variant: { select: { id: true, sku: true, nombre: true } },
          warehouse: { select: { id: true, codigo: true, nombre: true } },
        },
      });
    });
  }

  /** Libera lo pendiente de una reserva activa: devuelve reserved a available. */
  async liberarReserva(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const reserva = await tx.inventoryReservation.findFirst({
        where: { id, inquilinoId },
        select: {
          id: true,
          almacenId: true,
          varianteId: true,
          cantidad: true,
          cantidadAtendida: true,
          estado: true,
        },
      });
      if (!reserva) throw new NotFoundException('Reserva no encontrada');
      if (
        reserva.estado !== 'ACTIVA' &&
        reserva.estado !== 'PARCIALMENTE_ATENDIDA'
      )
        throw new ConflictException('La reserva ya no está activa');

      const pendiente = new Prisma.Decimal(reserva.cantidad).sub(
        new Prisma.Decimal(reserva.cantidadAtendida),
      );
      if (pendiente.gt(0)) {
        const lock = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "StockBalance"
          WHERE "inquilinoId" = ${inquilinoId}::uuid
            AND "almacenId" = ${reserva.almacenId}::uuid
            AND "varianteId" = ${reserva.varianteId}::uuid
          FOR UPDATE`;
        if (lock.length) {
          const saldo = await tx.stockBalance.findUnique({
            where: { id: lock[0].id },
          });
          if (saldo) {
            const enStock = new Prisma.Decimal(saldo.enStock);
            const reserved = new Prisma.Decimal(saldo.reserved).sub(pendiente);
            const nuevoReserved = reserved.lt(0)
              ? new Prisma.Decimal(0)
              : reserved;
            await tx.stockBalance.update({
              where: { id: saldo.id },
              data: {
                reserved: nuevoReserved,
                available: enStock.sub(nuevoReserved),
                version: { increment: 1 },
              },
            });
          }
        }
      }

      return tx.inventoryReservation.update({
        where: { id: reserva.id },
        data: { estado: 'LIBERADA' },
        select: { id: true, estado: true },
      });
    });
  }

  // ──────────────────────────── Conteos físicos ─────────────────────────────

  /** Lista conteos (más recientes primero) con almacén y nº de artículos. */
  async listarConteos(estado?: string, limit = 50) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.inventoryCount.findMany({
        where: { inquilinoId, ...(estado ? { estado: estado as never } : {}) },
        include: {
          warehouse: { select: { id: true, codigo: true, nombre: true } },
          _count: { select: { articulos: true } },
        },
        orderBy: { creadoEn: 'desc' },
        take: Math.min(Math.max(limit, 1), 200),
      }),
    );
  }

  /** Detalle de un conteo con sus artículos. */
  async obtenerConteo(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const conteo = await this.obtenerConteoTx(tx, inquilinoId, id);
      if (!conteo) throw new NotFoundException('Conteo no encontrado');
      return conteo;
    });
  }

  /**
   * Crea un conteo físico para un almacén, tomando una foto del stock actual
   * como cantidad esperada de cada variante con saldo. Queda EN_PROGRESO.
   */
  async crearConteo(dto: CrearConteoDto) {
    const { inquilinoId, membresiaId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const almacen = await tx.warehouse.findFirst({
        where: { id: dto.almacenId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      });
      if (!almacen)
        throw new NotFoundException('Almacén no encontrado o inactivo');

      const saldos = await tx.stockBalance.findMany({
        where: {
          inquilinoId,
          almacenId: dto.almacenId,
          variant: { estado: 'ACTIVO', isStockTracked: true },
        },
        select: { varianteId: true, enStock: true },
      });

      const number = await this.siguienteNumeroConteo(tx, inquilinoId);
      const conteo = await tx.inventoryCount.create({
        data: {
          inquilinoId,
          almacenId: dto.almacenId,
          number,
          estado: 'EN_PROGRESO',
          contadoPorId: membresiaId ?? null,
          iniciadoEn: new Date(),
        },
        select: { id: true },
      });
      // createMany (input unchecked) acepta los escalares directamente; el
      // create anidado no expone inquilinoId por compartirlo count y variant.
      if (saldos.length) {
        await tx.inventoryCountItem.createMany({
          data: saldos.map((s) => ({
            inquilinoId,
            countId: conteo.id,
            varianteId: s.varianteId,
            cantidadEsperada: new Prisma.Decimal(s.enStock),
          })),
        });
      }
      return this.obtenerConteoTx(tx, inquilinoId, conteo.id);
    });
  }

  /** Registra las cantidades contadas (crea ítems nuevos si se hallan extras). */
  async registrarConteo(id: string, dto: RegistrarConteoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const conteo = await tx.inventoryCount.findFirst({
        where: { id, inquilinoId },
        select: { id: true, estado: true },
      });
      if (!conteo) throw new NotFoundException('Conteo no encontrado');
      if (conteo.estado !== 'EN_PROGRESO' && conteo.estado !== 'ENVIADO')
        throw new ConflictException(
          'Solo se puede registrar en un conteo en progreso',
        );

      for (const art of dto.articulos) {
        const contada = new Prisma.Decimal(art.cantidadContada);
        const existente = await tx.inventoryCountItem.findFirst({
          where: { inquilinoId, countId: id, varianteId: art.varianteId },
          select: { id: true, cantidadEsperada: true },
        });
        if (existente) {
          await tx.inventoryCountItem.update({
            where: { id: existente.id },
            data: {
              cantidadContada: contada,
              cantidadDiferencia: contada.sub(
                new Prisma.Decimal(existente.cantidadEsperada),
              ),
              motivo: art.motivo?.trim() || null,
            },
          });
        } else {
          // Variante no prevista (stock hallado que no figuraba): esperada 0.
          const variante = await tx.productVariant.findFirst({
            where: { id: art.varianteId, inquilinoId, estado: 'ACTIVO' },
            select: { id: true },
          });
          if (!variante)
            throw new NotFoundException(
              `Variante ${art.varianteId} no encontrada`,
            );
          await tx.inventoryCountItem.create({
            data: {
              inquilinoId,
              countId: id,
              varianteId: art.varianteId,
              cantidadEsperada: new Prisma.Decimal(0),
              cantidadContada: contada,
              cantidadDiferencia: contada,
              motivo: art.motivo?.trim() || null,
            },
          });
        }
      }
      return this.obtenerConteoTx(tx, inquilinoId, id);
    });
  }

  /**
   * Contabiliza el conteo: ajusta el stock físico a lo contado. Por cada ítem
   * contado bloquea el saldo, lo iguala a la cantidad contada y deja un asiento
   * GANANCIA_CONTEO/PERDIDA_CONTEO por la diferencia contra el stock vivo.
   */
  async contabilizarConteo(id: string) {
    const { inquilinoId, membresiaId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const conteo = await tx.inventoryCount.findFirst({
        where: { id, inquilinoId },
        include: { articulos: true },
      });
      if (!conteo) throw new NotFoundException('Conteo no encontrado');
      if (conteo.estado !== 'EN_PROGRESO' && conteo.estado !== 'ENVIADO')
        throw new ConflictException(
          'El conteo ya fue contabilizado o cancelado',
        );

      const ahora = new Date();
      for (const item of conteo.articulos) {
        if (item.cantidadContada === null) continue;
        const contada = new Prisma.Decimal(item.cantidadContada);

        const lock = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "StockBalance"
          WHERE "inquilinoId" = ${inquilinoId}::uuid
            AND "almacenId" = ${conteo.almacenId}::uuid
            AND "varianteId" = ${item.varianteId}::uuid
          FOR UPDATE`;
        const saldo = lock.length
          ? await tx.stockBalance.findUnique({ where: { id: lock[0].id } })
          : null;

        const vivo = saldo
          ? new Prisma.Decimal(saldo.enStock)
          : new Prisma.Decimal(0);
        const costo = saldo
          ? new Prisma.Decimal(saldo.costoPromedio)
          : new Prisma.Decimal(0);
        const reserved = saldo
          ? new Prisma.Decimal(saldo.reserved)
          : new Prisma.Decimal(0);
        const diff = contada.sub(vivo);

        if (saldo) {
          await tx.stockBalance.update({
            where: { id: saldo.id },
            data: {
              enStock: contada,
              available: contada.sub(reserved),
              version: { increment: 1 },
            },
          });
        } else if (contada.gt(0)) {
          await tx.stockBalance.create({
            data: {
              inquilinoId,
              almacenId: conteo.almacenId,
              varianteId: item.varianteId,
              enStock: contada,
              available: contada,
              costoPromedio: costo,
            },
          });
        }

        // Asiento solo si hay diferencia real.
        if (!diff.isZero()) {
          await tx.inventoryLedgerEntry.create({
            data: {
              inquilinoId,
              almacenId: conteo.almacenId,
              varianteId: item.varianteId,
              movementType: diff.gt(0) ? 'GANANCIA_CONTEO' : 'PERDIDA_CONTEO',
              cantidad: diff,
              costoUnitario: costo,
              totalCost: costo.mul(diff),
              referenciaType: 'CONTEO',
              referenciaId: conteo.id,
              correlationId: conteo.id,
              idempotencyKey: `conteo:${conteo.id}:${item.varianteId}`,
              notas: item.motivo,
              occurredAt: ahora,
            },
          });
        }

        // Ajusta el snapshot del ítem al valor vivo y su diferencia real.
        await tx.inventoryCountItem.update({
          where: { id: item.id },
          data: { cantidadEsperada: vivo, cantidadDiferencia: diff },
        });
      }

      await tx.inventoryCount.update({
        where: { id: conteo.id },
        data: {
          estado: 'CONTABILIZADO',
          aprobadoPorId: membresiaId ?? conteo.aprobadoPorId,
          completadoEn: ahora,
          postedAt: ahora,
        },
      });
      return this.obtenerConteoTx(tx, inquilinoId, conteo.id);
    });
  }

  /** Cancela un conteo que aún no se contabilizó. */
  async cancelarConteo(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const conteo = await tx.inventoryCount.findFirst({
        where: { id, inquilinoId },
        select: { id: true, estado: true },
      });
      if (!conteo) throw new NotFoundException('Conteo no encontrado');
      if (conteo.estado === 'CONTABILIZADO')
        throw new ConflictException(
          'No se puede cancelar un conteo contabilizado',
        );
      return tx.inventoryCount.update({
        where: { id },
        data: { estado: 'CANCELADO' },
        select: { id: true, estado: true },
      });
    });
  }

  private async obtenerConteoTx(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    id: string,
  ) {
    return tx.inventoryCount.findFirst({
      where: { id, inquilinoId },
      include: {
        warehouse: { select: { id: true, codigo: true, nombre: true } },
        articulos: {
          include: {
            variant: { select: { id: true, sku: true, nombre: true } },
          },
          orderBy: { varianteId: 'asc' },
        },
      },
    });
  }

  private async siguienteNumeroConteo(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
  ): Promise<string> {
    const count = await tx.inventoryCount.count({ where: { inquilinoId } });
    return `CONT-${String(count + 1).padStart(6, '0')}`;
  }

  // ─────────────────────────────── Transferencias ───────────────────────────

  /** Lista transferencias (más recientes primero), con almacenes y conteo. */
  async listarTransferencias(estado?: string, limit = 50) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      return tx.inventoryTransfer.findMany({
        where: {
          inquilinoId,
          ...(estado ? { estado: estado as never } : {}),
        },
        include: {
          originWarehouse: { select: { id: true, codigo: true, nombre: true } },
          destinationWarehouse: {
            select: { id: true, codigo: true, nombre: true },
          },
          _count: { select: { articulos: true } },
        },
        orderBy: { creadoEn: 'desc' },
        take: Math.min(Math.max(limit, 1), 200),
      });
    });
  }

  /** Detalle de una transferencia con sus artículos. */
  async obtenerTransferencia(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id, inquilinoId },
        include: {
          originWarehouse: { select: { id: true, codigo: true, nombre: true } },
          destinationWarehouse: {
            select: { id: true, codigo: true, nombre: true },
          },
          articulos: {
            include: {
              variant: {
                select: { id: true, sku: true, nombre: true },
              },
            },
          },
        },
      });
      if (!transfer) throw new NotFoundException('Transferencia no encontrada');
      return transfer;
    });
  }

  /**
   * Crea y envía una transferencia en un solo paso: descuenta el stock del
   * almacén origen y lo deja "en tránsito" en el destino (estado EN_TRANSITO).
   * La recepción se confirma luego con `recibirTransferencia`.
   */
  async crearTransferencia(dto: CrearTransferenciaDto) {
    const { inquilinoId, membresiaId } = this.contexto.obtenerObligatorio();
    if (dto.almacenOrigenId === dto.almacenDestinoId)
      throw new ConflictException(
        'El almacén origen y destino deben ser distintos',
      );

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      // Idempotencia: los asientos de salida se crean con la clave
      // `transf-salida:${idempotencyKey}:${varianteId}` (una por variante), así
      // que se busca por prefijo. Buscar la clave exacta sin sufijo nunca
      // acertaba y rompía la idempotencia (reintento → unique violation).
      const yaExiste = await tx.inventoryLedgerEntry.findFirst({
        where: {
          inquilinoId,
          movementType: 'TRANSFERENCIA_SALIDA',
          idempotencyKey: { startsWith: `transf-salida:${dto.idempotencyKey}:` },
        },
        select: { correlationId: true },
      });
      if (yaExiste?.correlationId) {
        return this.obtenerTransferenciaTx(
          tx,
          inquilinoId,
          yaExiste.correlationId,
        );
      }

      const origen = await tx.warehouse.findFirst({
        where: { id: dto.almacenOrigenId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      });
      const destino = await tx.warehouse.findFirst({
        where: { id: dto.almacenDestinoId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      });
      if (!origen) throw new NotFoundException('Almacén origen no encontrado');
      if (!destino)
        throw new NotFoundException('Almacén destino no encontrado');

      // Consolidar cantidades por variante (evita duplicados en el payload).
      const porVariante = new Map<string, Prisma.Decimal>();
      for (const art of dto.articulos) {
        const prev = porVariante.get(art.varianteId) ?? new Prisma.Decimal(0);
        porVariante.set(art.varianteId, prev.add(art.cantidad));
      }

      const number = await this.siguienteNumeroTransferencia(tx, inquilinoId);
      const transfer = await tx.inventoryTransfer.create({
        data: {
          inquilinoId,
          number,
          almacenOrigenId: dto.almacenOrigenId,
          almacenDestinoId: dto.almacenDestinoId,
          estado: 'EN_TRANSITO',
          solicitadoPorId: membresiaId ?? null,
          shippedAt: new Date(),
          notes: dto.notas?.trim() || null,
        },
        select: { id: true },
      });

      const ahora = new Date();
      for (const [varianteId, cantidad] of porVariante) {
        const variante = await tx.productVariant.findFirst({
          where: { id: varianteId, inquilinoId, estado: 'ACTIVO' },
          select: { id: true, isStockTracked: true, allowNegativeStock: true },
        });
        if (!variante)
          throw new NotFoundException(`Variante ${varianteId} no encontrada`);
        if (!variante.isStockTracked)
          throw new ConflictException(
            'Una de las variantes no controla inventario',
          );

        // Bloqueo pesimista del saldo origen.
        const lock = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "StockBalance"
          WHERE "inquilinoId" = ${inquilinoId}::uuid
            AND "almacenId" = ${dto.almacenOrigenId}::uuid
            AND "varianteId" = ${varianteId}::uuid
          FOR UPDATE`;
        const saldoOrigen = lock.length
          ? await tx.stockBalance.findUnique({ where: { id: lock[0].id } })
          : null;
        if (!saldoOrigen)
          throw new ConflictException(
            'No hay stock en el almacén origen para una de las variantes',
          );

        const enStock = new Prisma.Decimal(saldoOrigen.enStock);
        const reserved = new Prisma.Decimal(saldoOrigen.reserved);
        const costo = new Prisma.Decimal(saldoOrigen.costoPromedio);
        const nuevoStock = enStock.sub(cantidad);
        if (nuevoStock.lt(0) && !variante.allowNegativeStock)
          throw new ConflictException(
            'Stock insuficiente en el almacén origen',
          );

        // Origen: baja stock y disponible; registra asiento de salida.
        await tx.stockBalance.update({
          where: { id: saldoOrigen.id },
          data: {
            enStock: nuevoStock,
            available: nuevoStock.sub(reserved),
            version: { increment: 1 },
          },
        });
        await tx.inventoryLedgerEntry.create({
          data: {
            inquilinoId,
            almacenId: dto.almacenOrigenId,
            varianteId,
            movementType: 'TRANSFERENCIA_SALIDA',
            cantidad,
            costoUnitario: costo,
            totalCost: cantidad.mul(costo),
            referenciaType: 'TRANSFERENCIA',
            referenciaId: transfer.id,
            correlationId: transfer.id,
            idempotencyKey: `transf-salida:${dto.idempotencyKey}:${varianteId}`,
            occurredAt: ahora,
          },
        });

        // Destino: crea/actualiza saldo y suma a "en tránsito".
        const lockDest = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "StockBalance"
          WHERE "inquilinoId" = ${inquilinoId}::uuid
            AND "almacenId" = ${dto.almacenDestinoId}::uuid
            AND "varianteId" = ${varianteId}::uuid
          FOR UPDATE`;
        if (lockDest.length) {
          await tx.stockBalance.update({
            where: { id: lockDest[0].id },
            data: {
              enTransito: { increment: cantidad },
              version: { increment: 1 },
            },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              inquilinoId,
              almacenId: dto.almacenDestinoId,
              varianteId,
              enStock: new Prisma.Decimal(0),
              available: new Prisma.Decimal(0),
              enTransito: cantidad,
              costoPromedio: new Prisma.Decimal(0),
            },
          });
        }

        await tx.inventoryTransferItem.create({
          data: {
            inquilinoId,
            transferId: transfer.id,
            varianteId,
            requestedQty: cantidad,
            shippedQty: cantidad,
          },
        });
      }

      return this.obtenerTransferenciaTx(tx, inquilinoId, transfer.id);
    });
  }

  /**
   * Confirma la recepción (total o parcial) de una transferencia en tránsito.
   * Baja el "en tránsito" del destino, suma al stock físico con costo promedio
   * ponderado y actualiza el estado (RECIBIDA / RECIBIDA_PARCIALMENTE).
   */
  async recibirTransferencia(id: string, dto: RecibirTransferenciaDto) {
    const { inquilinoId, membresiaId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id, inquilinoId },
        include: { articulos: true },
      });
      if (!transfer) throw new NotFoundException('Transferencia no encontrada');
      if (
        transfer.estado !== 'EN_TRANSITO' &&
        transfer.estado !== 'RECIBIDA_PARCIALMENTE'
      )
        throw new ConflictException(
          'Solo se pueden recibir transferencias en tránsito',
        );

      const recibidoDto = new Map<string, Prisma.Decimal>();
      for (const art of dto.articulos) {
        if (art.cantidad <= 0) continue;
        const prev = recibidoDto.get(art.varianteId) ?? new Prisma.Decimal(0);
        recibidoDto.set(art.varianteId, prev.add(art.cantidad));
      }

      const ahora = new Date();
      for (const item of transfer.articulos) {
        const recibirAhora = recibidoDto.get(item.varianteId);
        if (!recibirAhora || recibirAhora.lte(0)) continue;

        const yaRecibido = new Prisma.Decimal(item.receivedQty);
        const enviado = new Prisma.Decimal(item.shippedQty);
        const pendiente = enviado.sub(yaRecibido);
        if (recibirAhora.gt(pendiente))
          throw new ConflictException(
            'La cantidad recibida supera lo pendiente en tránsito',
          );

        // Costo del asiento de salida (para promedio ponderado en destino).
        const salida = await tx.inventoryLedgerEntry.findFirst({
          where: {
            inquilinoId,
            correlationId: transfer.id,
            varianteId: item.varianteId,
            movementType: 'TRANSFERENCIA_SALIDA',
          },
          select: { costoUnitario: true },
        });
        const costo = new Prisma.Decimal(salida?.costoUnitario ?? 0);

        const lock = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "StockBalance"
          WHERE "inquilinoId" = ${inquilinoId}::uuid
            AND "almacenId" = ${transfer.almacenDestinoId}::uuid
            AND "varianteId" = ${item.varianteId}::uuid
          FOR UPDATE`;
        if (!lock.length)
          throw new ConflictException('Saldo de destino no encontrado');
        const saldo = await tx.stockBalance.findUnique({
          where: { id: lock[0].id },
        });
        if (!saldo)
          throw new ConflictException('Saldo de destino no encontrado');

        const enStock = new Prisma.Decimal(saldo.enStock);
        const reserved = new Prisma.Decimal(saldo.reserved);
        const enTransito = new Prisma.Decimal(saldo.enTransito);
        const avg = new Prisma.Decimal(saldo.costoPromedio);
        const nuevoStock = enStock.add(recibirAhora);
        const den = enStock.add(recibirAhora);
        const nuevoAvg = den.gt(0)
          ? enStock.mul(avg).add(recibirAhora.mul(costo)).div(den)
          : costo;

        await tx.stockBalance.update({
          where: { id: saldo.id },
          data: {
            enStock: nuevoStock,
            available: nuevoStock.sub(reserved),
            enTransito: enTransito.sub(recibirAhora),
            costoPromedio: nuevoAvg,
            version: { increment: 1 },
          },
        });
        await tx.inventoryLedgerEntry.create({
          data: {
            inquilinoId,
            almacenId: transfer.almacenDestinoId,
            varianteId: item.varianteId,
            movementType: 'TRANSFERENCIA_ENTRADA',
            cantidad: recibirAhora,
            costoUnitario: costo,
            totalCost: recibirAhora.mul(costo),
            referenciaType: 'TRANSFERENCIA',
            referenciaId: transfer.id,
            correlationId: transfer.id,
            idempotencyKey: `transf-entrada:${dto.idempotencyKey}:${item.varianteId}`,
            occurredAt: ahora,
          },
        });
        await tx.inventoryTransferItem.update({
          where: { id: item.id },
          data: { receivedQty: yaRecibido.add(recibirAhora) },
        });
      }

      // Recalcular estado: RECIBIDA si todo lo enviado se recibió.
      const items = await tx.inventoryTransferItem.findMany({
        where: { inquilinoId, transferId: transfer.id },
        select: { shippedQty: true, receivedQty: true },
      });
      const totalmente = items.every((i) =>
        new Prisma.Decimal(i.receivedQty).gte(new Prisma.Decimal(i.shippedQty)),
      );
      await tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: {
          estado: totalmente ? 'RECIBIDA' : 'RECIBIDA_PARCIALMENTE',
          aprobadoPorId: membresiaId ?? transfer.aprobadoPorId,
          recibidoEn: totalmente ? new Date() : transfer.recibidoEn,
        },
      });

      return this.obtenerTransferenciaTx(tx, inquilinoId, transfer.id);
    });
  }

  /**
   * Cancela una transferencia en tránsito que aún no recibió nada: devuelve el
   * stock al origen y limpia el "en tránsito" del destino.
   */
  async cancelarTransferencia(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id, inquilinoId },
        include: { articulos: true },
      });
      if (!transfer) throw new NotFoundException('Transferencia no encontrada');
      if (transfer.estado !== 'EN_TRANSITO')
        throw new ConflictException(
          'Solo se pueden cancelar transferencias en tránsito sin recepciones',
        );
      const algoRecibido = transfer.articulos.some((i) =>
        new Prisma.Decimal(i.receivedQty).gt(0),
      );
      if (algoRecibido)
        throw new ConflictException(
          'No se puede cancelar: la transferencia ya tiene recepciones',
        );

      const ahora = new Date();
      for (const item of transfer.articulos) {
        const cantidad = new Prisma.Decimal(item.shippedQty);
        if (cantidad.lte(0)) continue;

        // Origen: reponer stock.
        const lockOrig = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "StockBalance"
          WHERE "inquilinoId" = ${inquilinoId}::uuid
            AND "almacenId" = ${transfer.almacenOrigenId}::uuid
            AND "varianteId" = ${item.varianteId}::uuid
          FOR UPDATE`;
        const salida = await tx.inventoryLedgerEntry.findFirst({
          where: {
            inquilinoId,
            correlationId: transfer.id,
            varianteId: item.varianteId,
            movementType: 'TRANSFERENCIA_SALIDA',
          },
          select: { costoUnitario: true },
        });
        const costo = new Prisma.Decimal(salida?.costoUnitario ?? 0);
        if (lockOrig.length) {
          const saldo = await tx.stockBalance.findUnique({
            where: { id: lockOrig[0].id },
          });
          if (saldo) {
            const enStock = new Prisma.Decimal(saldo.enStock).add(cantidad);
            const reserved = new Prisma.Decimal(saldo.reserved);
            await tx.stockBalance.update({
              where: { id: saldo.id },
              data: {
                enStock,
                available: enStock.sub(reserved),
                version: { increment: 1 },
              },
            });
          }
        }
        await tx.inventoryLedgerEntry.create({
          data: {
            inquilinoId,
            almacenId: transfer.almacenOrigenId,
            varianteId: item.varianteId,
            movementType: 'TRANSFERENCIA_ENTRADA',
            cantidad,
            costoUnitario: costo,
            totalCost: cantidad.mul(costo),
            referenciaType: 'TRANSFERENCIA_CANCELADA',
            referenciaId: transfer.id,
            correlationId: transfer.id,
            idempotencyKey: `transf-cancel:${transfer.id}:${item.varianteId}`,
            occurredAt: ahora,
          },
        });

        // Destino: quitar el "en tránsito".
        const lockDest = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "StockBalance"
          WHERE "inquilinoId" = ${inquilinoId}::uuid
            AND "almacenId" = ${transfer.almacenDestinoId}::uuid
            AND "varianteId" = ${item.varianteId}::uuid
          FOR UPDATE`;
        if (lockDest.length) {
          const saldo = await tx.stockBalance.findUnique({
            where: { id: lockDest[0].id },
          });
          if (saldo) {
            const enTransito = new Prisma.Decimal(saldo.enTransito).sub(
              cantidad,
            );
            await tx.stockBalance.update({
              where: { id: saldo.id },
              data: {
                enTransito: enTransito.lt(0)
                  ? new Prisma.Decimal(0)
                  : enTransito,
                version: { increment: 1 },
              },
            });
          }
        }
      }

      await tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: { estado: 'CANCELADA' },
      });
      return this.obtenerTransferenciaTx(tx, inquilinoId, transfer.id);
    });
  }

  /** Detalle de transferencia reusando una transacción abierta. */
  private async obtenerTransferenciaTx(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    id: string,
  ) {
    return tx.inventoryTransfer.findFirst({
      where: { id, inquilinoId },
      include: {
        originWarehouse: { select: { id: true, codigo: true, nombre: true } },
        destinationWarehouse: {
          select: { id: true, codigo: true, nombre: true },
        },
        articulos: {
          include: {
            variant: { select: { id: true, sku: true, nombre: true } },
          },
        },
      },
    });
  }

  /** Correlativo simple TR-000001 por inquilino. */
  private async siguienteNumeroTransferencia(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
  ): Promise<string> {
    const count = await tx.inventoryTransfer.count({ where: { inquilinoId } });
    return `TR-${String(count + 1).padStart(6, '0')}`;
  }
}
