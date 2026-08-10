import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CrearVentaDto } from '../ventas/dto/crear-venta.dto';
import { VentasService } from '../ventas/ventas.service';
import {
  AbrirComandaDto,
  ActualizarCocinaDto,
  ActualizarMesaDto,
  AgregarItemDto,
  CobrarComandaDto,
  CrearMesaDto,
} from './dto/restaurante.dto';

@Injectable()
export class RestauranteService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly ventas: VentasService,
  ) {}

  // ─────────────────────────────── Mesas ────────────────────────────────────

  async crearMesa(dto: CrearMesaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sucursal = await tx.branch.findFirst({
        where: { id: dto.sucursalId, inquilinoId },
        select: { id: true },
      });
      if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
      return tx.restaurantTable.create({
        data: {
          inquilinoId,
          sucursalId: dto.sucursalId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          zona: dto.zona?.trim() || null,
          capacidad: dto.capacidad ?? 2,
          posX: dto.posX ?? 0,
          posY: dto.posY ?? 0,
        },
      });
    });
  }

  async listarMesas(sucursalId?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.restaurantTable.findMany({
        where: {
          inquilinoId,
          estadoRegistro: 'ACTIVO',
          ...(sucursalId ? { sucursalId } : {}),
        },
        orderBy: [{ zona: 'asc' }, { codigo: 'asc' }],
      }),
    );
  }

  async actualizarMesa(id: string, dto: ActualizarMesaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const mesa = await tx.restaurantTable.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!mesa) throw new NotFoundException('Mesa no encontrada');
      return tx.restaurantTable.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.zona !== undefined ? { zona: dto.zona?.trim() || null } : {}),
          ...(dto.capacidad !== undefined ? { capacidad: dto.capacidad } : {}),
          ...(dto.posX !== undefined ? { posX: dto.posX } : {}),
          ...(dto.posY !== undefined ? { posY: dto.posY } : {}),
          ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        },
      });
    });
  }

  async archivarMesa(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const mesa = await tx.restaurantTable.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!mesa) throw new NotFoundException('Mesa no encontrada');
      return tx.restaurantTable.update({
        where: { id },
        data: { estadoRegistro: 'ARCHIVADO', estado: 'INACTIVA' },
        select: { id: true, estadoRegistro: true },
      });
    });
  }

  /** Mapa de mesas activas con su comanda en curso (si la hay) y total. */
  async mapaMesas(sucursalId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const mesas = await tx.restaurantTable.findMany({
        where: { inquilinoId, sucursalId, estadoRegistro: 'ACTIVO' },
        orderBy: [{ zona: 'asc' }, { codigo: 'asc' }],
      });
      const comandas = await tx.diningOrder.findMany({
        where: {
          inquilinoId,
          sucursalId,
          mesaId: { not: null },
          estado: { in: ['ABIERTA', 'EN_COCINA', 'POR_PAGAR'] },
        },
        select: {
          id: true,
          mesaId: true,
          estado: true,
          total: true,
          comensales: true,
          aperturaEn: true,
        },
        orderBy: { aperturaEn: 'desc' },
      });
      const porMesa = new Map<string, (typeof comandas)[number]>();
      for (const c of comandas) {
        if (c.mesaId && !porMesa.has(c.mesaId)) porMesa.set(c.mesaId, c);
      }
      return mesas.map((m) => ({
        ...m,
        comanda: porMesa.get(m.id) ?? null,
      }));
    });
  }

  // ────────────────────────────── Comandas ──────────────────────────────────

  async abrirComanda(dto: AbrirComandaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sucursal = await tx.branch.findFirst({
        where: { id: dto.sucursalId, inquilinoId },
        select: { id: true },
      });
      if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

      if (dto.mesaId) {
        const mesa = await tx.restaurantTable.findFirst({
          where: { id: dto.mesaId, inquilinoId, estadoRegistro: 'ACTIVO' },
          select: { id: true, estado: true },
        });
        if (!mesa) throw new NotFoundException('Mesa no encontrada');
        if (mesa.estado !== 'LIBRE')
          throw new ConflictException('La mesa no está libre');
      }

      const comanda = await tx.diningOrder.create({
        data: {
          inquilinoId,
          sucursalId: dto.sucursalId,
          mesaId: dto.mesaId ?? null,
          tipo: dto.tipo ?? 'MESA',
          estado: 'ABIERTA',
          mozoId: dto.mozoId ?? null,
          comensales: dto.comensales ?? 1,
          notas: dto.notas?.trim() || null,
        },
      });

      if (dto.mesaId) {
        await tx.restaurantTable.update({
          where: { id: dto.mesaId },
          data: { estado: 'OCUPADA' },
        });
      }
      return comanda;
    });
  }

  async obtenerComanda(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const comanda = await this.obtenerComandaTx(tx, inquilinoId, id);
      if (!comanda) throw new NotFoundException('Comanda no encontrada');
      return comanda;
    });
  }

  async listarComandas(sucursalId?: string, estado?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.diningOrder.findMany({
        where: {
          inquilinoId,
          ...(sucursalId ? { sucursalId } : {}),
          ...(estado
            ? { estado: estado as never }
            : { estado: { notIn: ['CERRADA', 'CANCELADA'] } }),
        },
        include: {
          mesa: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { aperturaEn: 'desc' },
      }),
    );
  }

  async agregarItem(comandaId: string, dto: AgregarItemDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const comanda = await tx.diningOrder.findFirst({
        where: { id: comandaId, inquilinoId },
        select: { id: true, estado: true },
      });
      if (!comanda) throw new NotFoundException('Comanda no encontrada');
      if (comanda.estado === 'CERRADA' || comanda.estado === 'CANCELADA')
        throw new ConflictException('La comanda ya no admite ítems');

      const precioUnitario = new Prisma.Decimal(dto.precioUnitario);
      const item = await tx.diningOrderItem.create({
        data: {
          inquilinoId,
          comandaId,
          varianteId: dto.varianteId,
          productoNombre: dto.productoNombre,
          cantidad: new Prisma.Decimal(dto.cantidad),
          precioUnitario,
          notas: dto.notas?.trim() || null,
          estacion: dto.estacion ?? 'COCINA',
          estadoCocina: 'PENDIENTE',
          modificadores: dto.modificadores?.length
            ? {
                create: dto.modificadores.map((m) => ({
                  inquilinoId,
                  nombre: m.nombre,
                  precioExtra: new Prisma.Decimal(m.precioExtra ?? 0),
                })),
              }
            : undefined,
        },
        include: { modificadores: true },
      });

      await this.recalcularTotales(tx, inquilinoId, comandaId);
      return item;
    });
  }

  async quitarItem(itemId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const item = await tx.diningOrderItem.findFirst({
        where: { id: itemId, inquilinoId },
        select: { id: true, comandaId: true, estadoCocina: true },
      });
      if (!item) throw new NotFoundException('Ítem no encontrado');
      if (item.estadoCocina !== 'PENDIENTE')
        throw new ConflictException(
          'Solo se pueden quitar ítems pendientes (no enviados/en preparación)',
        );
      await tx.diningOrderItemModifier.deleteMany({
        where: { inquilinoId, itemId },
      });
      await tx.diningOrderItem.delete({ where: { id: itemId } });
      await this.recalcularTotales(tx, inquilinoId, item.comandaId);
      return { id: itemId, eliminado: true };
    });
  }

  /** Envía a cocina: marca enviadoEn a los pendientes y pone la comanda EN_COCINA. */
  async enviarCocina(comandaId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const comanda = await tx.diningOrder.findFirst({
        where: { id: comandaId, inquilinoId },
        select: { id: true, estado: true },
      });
      if (!comanda) throw new NotFoundException('Comanda no encontrada');
      if (comanda.estado === 'CERRADA' || comanda.estado === 'CANCELADA')
        throw new ConflictException('La comanda ya no está activa');

      await tx.diningOrderItem.updateMany({
        where: {
          inquilinoId,
          comandaId,
          estadoCocina: 'PENDIENTE',
          enviadoEn: null,
        },
        data: { enviadoEn: new Date() },
      });
      await tx.diningOrder.update({
        where: { id: comandaId },
        data: { estado: 'EN_COCINA' },
      });
      return this.obtenerComandaTx(tx, inquilinoId, comandaId);
    });
  }

  async cancelarComanda(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const comanda = await tx.diningOrder.findFirst({
        where: { id, inquilinoId },
        select: { id: true, estado: true, mesaId: true, ventaId: true },
      });
      if (!comanda) throw new NotFoundException('Comanda no encontrada');
      if (comanda.estado === 'CERRADA')
        throw new ConflictException('La comanda ya está cerrada');
      if (comanda.ventaId)
        throw new ConflictException('La comanda ya tiene una venta asociada');

      await tx.diningOrder.update({
        where: { id },
        data: { estado: 'CANCELADA', cierreEn: new Date() },
      });
      if (comanda.mesaId) {
        await tx.restaurantTable.update({
          where: { id: comanda.mesaId },
          data: { estado: 'LIBRE' },
        });
      }
      return { id, estado: 'CANCELADA' };
    });
  }

  // ─────────────────────────────────── KDS ──────────────────────────────────

  /** Cola de cocina: ítems enviados aún no terminados, agrupados por comanda. */
  async kds(sucursalId: string, estacion?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const items = await tx.diningOrderItem.findMany({
        where: {
          inquilinoId,
          enviadoEn: { not: null },
          estadoCocina: { in: ['PENDIENTE', 'EN_PREPARACION'] },
          ...(estacion ? { estacion: estacion as never } : {}),
          comanda: {
            sucursalId,
            estado: { in: ['ABIERTA', 'EN_COCINA'] },
          },
        },
        include: {
          modificadores: true,
          comanda: {
            select: {
              id: true,
              comensales: true,
              notas: true,
              mesa: { select: { id: true, codigo: true, nombre: true } },
            },
          },
        },
        orderBy: { enviadoEn: 'asc' },
      });

      const grupos = new Map<
        string,
        {
          comandaId: string;
          mesa: { id: string; codigo: string; nombre: string } | null;
          items: (typeof items)[number][];
        }
      >();
      for (const it of items) {
        const key = it.comandaId;
        const g = grupos.get(key) ?? {
          comandaId: key,
          mesa: it.comanda.mesa ?? null,
          items: [],
        };
        g.items.push(it);
        grupos.set(key, g);
      }
      return Array.from(grupos.values());
    });
  }

  async actualizarCocina(itemId: string, dto: ActualizarCocinaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const item = await tx.diningOrderItem.findFirst({
        where: { id: itemId, inquilinoId },
        select: { id: true },
      });
      if (!item) throw new NotFoundException('Ítem no encontrado');
      return tx.diningOrderItem.update({
        where: { id: itemId },
        data: {
          estadoCocina: dto.estado,
          ...(dto.estado === 'LISTO' ? { listoEn: new Date() } : {}),
        },
      });
    });
  }

  // ─────────────────────────────────── Cobro ────────────────────────────────

  /**
   * Cobra la comanda reusando VentasService.crear. Si viene `itemIds`, cobra
   * solo esos ítems (división de cuenta). Si se cobran todos, cierra la comanda
   * y libera la mesa; si es parcial, la deja POR_PAGAR.
   *
   * Limitación conocida (follow-up): no hay marca de "cobrado" por ítem en el
   * modelo, así que un segundo cobro parcial re-evalúa sobre todos los ítems.
   */
  async cobrar(comandaId: string, dto: CobrarComandaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();

    // Carga la comanda + items + moneda (fuera de la tx de la venta).
    const datos = await this.prisma.ejecutarEnTenant(
      inquilinoId,
      async (tx) => {
        const comanda = await tx.diningOrder.findFirst({
          where: { id: comandaId, inquilinoId },
          include: {
            items: { select: { id: true, varianteId: true, cantidad: true } },
          },
        });
        if (!comanda) throw new NotFoundException('Comanda no encontrada');
        if (comanda.estado === 'CERRADA')
          throw new ConflictException('La comanda ya fue cobrada');
        if (comanda.estado === 'CANCELADA')
          throw new ConflictException('La comanda está cancelada');
        if (comanda.ventaId)
          throw new ConflictException('La comanda ya tiene una venta asociada');
        const empresa = await tx.company.findFirst({
          where: { id: dto.empresaId, inquilinoId },
          select: { moneda: true },
        });
        return { comanda, moneda: empresa?.moneda ?? 'PEN' };
      },
    );

    const { comanda } = datos;
    if (!comanda.items.length)
      throw new BadRequestException('La comanda no tiene ítems para cobrar');

    let itemsACobrar = comanda.items;
    if (dto.itemIds?.length) {
      const set = new Set(dto.itemIds);
      itemsACobrar = comanda.items.filter((i) => set.has(i.id));
      if (itemsACobrar.length !== set.size)
        throw new BadRequestException(
          'Algunos ítems no pertenecen a la comanda',
        );
    }
    if (!itemsACobrar.length)
      throw new BadRequestException('No hay ítems para cobrar');

    const ventaDto: CrearVentaDto = {
      empresaId: dto.empresaId,
      sucursalId: comanda.sucursalId,
      serieId: dto.serieId,
      sesionCajaId: dto.sesionCajaId,
      clienteId: dto.clienteId,
      moneda: datos.moneda,
      idempotencyKey: `comanda:${comandaId}:${randomUUID()}`,
      items: itemsACobrar.map((i) => ({
        varianteId: i.varianteId,
        cantidad: Number(i.cantidad),
      })),
      pagos: dto.pagos.map((p) => ({
        method: p.method as never,
        monto: p.monto,
        referencia: p.referencia,
      })),
    };

    const venta = await this.ventas.crear(ventaDto);
    const ventaId = (venta as { id: string }).id;

    const total = itemsACobrar.length === comanda.items.length;
    const comandaActualizada = await this.prisma.ejecutarEnTenant(
      inquilinoId,
      async (tx) => {
        const ahora = new Date();
        return tx.diningOrder.update({
          where: { id: comandaId },
          data: {
            ventaId,
            propina: new Prisma.Decimal(dto.propina ?? 0),
            estado: total ? 'CERRADA' : 'POR_PAGAR',
            ...(total ? { cierreEn: ahora } : {}),
          },
        });
      },
    );

    if (total && comanda.mesaId) {
      await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
        tx.restaurantTable.update({
          where: { id: comanda.mesaId! },
          data: { estado: 'LIBRE' },
        }),
      );
    }

    return { ventaId, comanda: comandaActualizada };
  }

  // ─────────────────────────────── Helpers ──────────────────────────────────

  private async obtenerComandaTx(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    id: string,
  ) {
    return tx.diningOrder.findFirst({
      where: { id, inquilinoId },
      include: {
        mesa: { select: { id: true, codigo: true, nombre: true } },
        items: {
          include: { modificadores: true },
          orderBy: { creadoEn: 'asc' },
        },
      },
    });
  }

  /** Recalcula subtotal/total de la comanda a partir de sus ítems. */
  private async recalcularTotales(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    comandaId: string,
  ) {
    const items = await tx.diningOrderItem.findMany({
      where: { inquilinoId, comandaId },
      include: { modificadores: { select: { precioExtra: true } } },
    });
    let subtotal = new Prisma.Decimal(0);
    for (const it of items) {
      const extras = it.modificadores.reduce(
        (acc, m) => acc.add(new Prisma.Decimal(m.precioExtra)),
        new Prisma.Decimal(0),
      );
      const unit = new Prisma.Decimal(it.precioUnitario).add(extras);
      subtotal = subtotal.add(unit.mul(new Prisma.Decimal(it.cantidad)));
    }
    await tx.diningOrder.update({
      where: { id: comandaId },
      data: { subtotal, total: subtotal },
    });
  }
}
