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
  ActualizarPromocionDto,
  CrearPromocionDto,
  EstadoPromocionDto,
  ListarPromocionesDto,
  PromocionesAplicablesDto,
} from './dto/promociones.dto';
import {
  MotorPromociones,
  type LineaPromo,
  type PromocionAplicable,
} from './motor-promociones';

type TxPrisma = Prisma.TransactionClient;

/** CRUD de promociones y resolución de las que aplican a un carrito/venta. */
@Injectable()
export class PromocionesService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly autorizacion: AutorizacionSucursalService,
    private readonly motor: MotorPromociones,
  ) {}

  async crearPromocion(dto: CrearPromocionDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    this.validarBeneficio(dto);
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const empresa = await tx.company.findFirst({
        where: { id: dto.empresaId, inquilinoId },
        select: { id: true },
      });
      if (!empresa) throw new NotFoundException('Empresa no encontrada');
      const dup = await tx.promotion.findFirst({
        where: { inquilinoId, empresaId: dto.empresaId, codigo: dto.codigo },
        select: { id: true },
      });
      if (dup)
        throw new ConflictException(
          `Ya existe una promoción con código ${dto.codigo}`,
        );
      await this.exigirProductosDeEmpresa(tx, inquilinoId, dto.productoIds);

      const promo = await tx.promotion.create({
        data: {
          inquilinoId,
          empresaId: dto.empresaId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          descripcion: dto.descripcion ?? null,
          tipoBeneficio: dto.tipoBeneficio,
          valor: dto.valor ?? null,
          compraCantidad: dto.compraCantidad ?? null,
          pagaCantidad: dto.pagaCantidad ?? null,
          iniciaEn: new Date(dto.iniciaEn),
          terminaEn: dto.terminaEn ? new Date(dto.terminaEn) : null,
          prioridad: dto.prioridad ?? 0,
          acumulable: dto.acumulable ?? false,
          cantidadMinima: dto.cantidadMinima ?? null,
          montoMinimoVenta: dto.montoMinimoVenta ?? null,
          usoMaximo: dto.usoMaximo ?? null,
          scopes: {
            create: dto.productoIds.map((id) => ({
              inquilinoId,
              alcance: 'PRODUCTO' as const,
              referenciaId: id,
            })),
          },
        },
        select: { id: true, codigo: true, nombre: true, estado: true },
      });
      return promo;
    });
  }

  listarPromociones(dto: ListarPromocionesDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 20, 100);
    const where: Prisma.PromotionWhereInput = {
      inquilinoId,
      empresaId: dto.empresaId,
      ...(dto.estado ? { estado: dto.estado } : {}),
      ...(dto.q
        ? {
            OR: [
              { codigo: { contains: dto.q, mode: 'insensitive' } },
              { nombre: { contains: dto.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const total = await tx.promotion.count({ where });
      const items = await tx.promotion.findMany({
        where,
        orderBy: [{ estado: 'asc' }, { prioridad: 'desc' }, { iniciaEn: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          codigo: true,
          nombre: true,
          tipoBeneficio: true,
          valor: true,
          estado: true,
          prioridad: true,
          iniciaEn: true,
          terminaEn: true,
          usoActual: true,
          usoMaximo: true,
          _count: { select: { scopes: true } },
        },
      });
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    });
  }

  obtenerPromocion(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const promo = await tx.promotion.findFirst({
        where: { id, inquilinoId },
        include: {
          scopes: {
            select: { alcance: true, referenciaId: true },
          },
        },
      });
      if (!promo) throw new NotFoundException('Promoción no encontrada');
      return promo;
    });
  }

  async actualizarPromocion(id: string, dto: ActualizarPromocionDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const promo = await tx.promotion.findFirst({
        where: { id, inquilinoId },
        select: {
          id: true,
          empresaId: true,
          tipoBeneficio: true,
          valor: true,
          compraCantidad: true,
          pagaCantidad: true,
        },
      });
      if (!promo) throw new NotFoundException('Promoción no encontrada');
      if (dto.productoIds) {
        await this.exigirProductosDeEmpresa(tx, inquilinoId, dto.productoIds);
      }
      // Merge con los valores actuales: un PATCH parcial (solo nombre, etc.)
      // no debe fallar por revalidar el beneficio con campos undefined.
      this.validarBeneficio({
        tipoBeneficio: dto.tipoBeneficio ?? (promo.tipoBeneficio as never),
        valor: dto.valor ?? (promo.valor != null ? Number(promo.valor) : undefined),
        compraCantidad: dto.compraCantidad ?? promo.compraCantidad ?? undefined,
        pagaCantidad: dto.pagaCantidad ?? promo.pagaCantidad ?? undefined,
      });

      return tx.promotion.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: dto.descripcion || null }
            : {}),
          ...(dto.tipoBeneficio !== undefined
            ? { tipoBeneficio: dto.tipoBeneficio }
            : {}),
          ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
          ...(dto.compraCantidad !== undefined
            ? { compraCantidad: dto.compraCantidad }
            : {}),
          ...(dto.pagaCantidad !== undefined
            ? { pagaCantidad: dto.pagaCantidad }
            : {}),
          ...(dto.iniciaEn !== undefined
            ? { iniciaEn: new Date(dto.iniciaEn) }
            : {}),
          ...(dto.terminaEn !== undefined
            ? { terminaEn: dto.terminaEn ? new Date(dto.terminaEn) : null }
            : {}),
          ...(dto.prioridad !== undefined ? { prioridad: dto.prioridad } : {}),
          ...(dto.acumulable !== undefined
            ? { acumulable: dto.acumulable }
            : {}),
          ...(dto.cantidadMinima !== undefined
            ? { cantidadMinima: dto.cantidadMinima }
            : {}),
          ...(dto.montoMinimoVenta !== undefined
            ? { montoMinimoVenta: dto.montoMinimoVenta }
            : {}),
          ...(dto.usoMaximo !== undefined ? { usoMaximo: dto.usoMaximo } : {}),
          // Reemplaza el conjunto de productos alcanzados si viene en el DTO.
          ...(dto.productoIds
            ? {
                scopes: {
                  deleteMany: {},
                  create: dto.productoIds.map((pid) => ({
                    inquilinoId,
                    alcance: 'PRODUCTO' as const,
                    referenciaId: pid,
                  })),
                },
              }
            : {}),
        },
        select: { id: true, codigo: true, nombre: true, estado: true },
      });
    });
  }

  async cambiarEstadoPromocion(id: string, estado: EstadoPromocionDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const promo = await tx.promotion.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!promo) throw new NotFoundException('Promoción no encontrada');
      return tx.promotion.update({
        where: { id },
        data: { estado },
        select: { id: true, estado: true },
      });
    });
  }

  /**
   * Vista previa para caja: dado un carrito, devuelve el mejor descuento por
   * línea y el total de descuento sugerido. El cobro definitivo revalida.
   */
  async aplicables(dto: PromocionesAplicablesDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    await this.autorizacion.exigirEnSucursal('ventas.crear', dto.sucursalId);
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const suc = await tx.branch.findFirst({
        where: { id: dto.sucursalId, inquilinoId },
        select: { empresaId: true },
      });
      if (!suc) throw new NotFoundException('Sucursal no encontrada');

      const variantes = await this.contextoVariantes(
        tx,
        inquilinoId,
        dto.items.map((i) => i.varianteId),
      );
      const promos = await this.cargarVigentes(tx, inquilinoId, suc.empresaId);

      // Contextos + base bruta total (para el gate de monto mínimo de venta).
      const contextos = dto.items
        .map((it) => {
          const v = variantes.get(it.varianteId);
          if (!v) return null;
          const cantidad = new Prisma.Decimal(it.cantidad);
          return {
            varianteId: it.varianteId,
            ctx: {
              productoId: v.productoId,
              cantidad,
              precioUnitario: v.precio,
              montoBruto: v.precio.mul(cantidad),
            } as LineaPromo,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const totalVenta = contextos.reduce(
        (acc, c) => acc.add(c.ctx.montoBruto),
        new Prisma.Decimal(0),
      );

      const idsUsadas = new Set<string>();
      const lineas = contextos.map((c) => {
        const r = this.motor.descuentosDeLinea(promos, c.ctx, totalVenta);
        r.detalles.forEach((d) => idsUsadas.add(d.promocionId));
        const primera = r.detalles[0];
        return {
          varianteId: c.varianteId,
          descuento:
            r.total.gt(0) && primera
              ? {
                  promocionId: primera.promocionId,
                  codigo: primera.codigo,
                  descripcion:
                    r.detalles.length > 1
                      ? `${r.detalles.length} promociones`
                      : primera.descripcion,
                  monto: r.total.toFixed(2),
                }
              : null,
        };
      })

      const totalDescuento = lineas.reduce(
        (acc, l) => acc.add(l.descuento ? new Prisma.Decimal(l.descuento.monto) : 0),
        new Prisma.Decimal(0),
      );
      const promocionIds = [...idsUsadas];
      return {
        lineas,
        totalDescuento: totalDescuento.toFixed(2),
        promocionIds,
      };
    });
  }

  /**
   * Carga las promociones vigentes por ids (revalidación en el cobro). Solo
   * ACTIVA y dentro de la ventana de fechas; con scopes resueltos a productos.
   */
  async cargarVigentesParaVenta(
    tx: TxPrisma,
    inquilinoId: string,
    empresaId: string,
    ids: string[],
  ): Promise<PromocionAplicable[]> {
    if (ids.length === 0) return [];
    return this.cargarVigentes(tx, inquilinoId, empresaId, ids);
  }

  private async cargarVigentes(
    tx: TxPrisma,
    inquilinoId: string,
    empresaId: string,
    ids?: string[],
  ): Promise<PromocionAplicable[]> {
    const ahora = new Date();
    const filas = await tx.promotion.findMany({
      where: {
        inquilinoId,
        empresaId,
        estado: 'ACTIVA',
        iniciaEn: { lte: ahora },
        OR: [{ terminaEn: null }, { terminaEn: { gt: ahora } }],
        ...(ids ? { id: { in: ids } } : {}),
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipoBeneficio: true,
        valor: true,
        compraCantidad: true,
        pagaCantidad: true,
        cantidadMinima: true,
        montoMinimoVenta: true,
        acumulable: true,
        prioridad: true,
        usoMaximo: true,
        usoActual: true,
        scopes: { select: { alcance: true, referenciaId: true } },
      },
    });
    return filas
      .filter((p) => p.usoMaximo == null || p.usoActual < p.usoMaximo)
      .map((p) => {
        const productoIds = new Set(
          p.scopes
            .filter((s) => s.alcance === 'PRODUCTO' && s.referenciaId)
            .map((s) => s.referenciaId as string),
        );
        return {
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          tipoBeneficio: p.tipoBeneficio,
          valor: p.valor,
          compraCantidad: p.compraCantidad,
          pagaCantidad: p.pagaCantidad,
          cantidadMinima: p.cantidadMinima,
          montoMinimoVenta: p.montoMinimoVenta,
          acumulable: p.acumulable,
          prioridad: p.prioridad,
          productoIds,
          alcanzaVenta: p.scopes.some((s) => s.alcance === 'VENTA'),
        };
      });
  }

  /** varianteId → { productoId, precio de lista vigente }. */
  private async contextoVariantes(
    tx: TxPrisma,
    inquilinoId: string,
    varianteIds: string[],
  ): Promise<Map<string, { productoId: string; precio: Prisma.Decimal }>> {
    const ids = [...new Set(varianteIds)];
    const variantes = await tx.productVariant.findMany({
      where: { inquilinoId, id: { in: ids }, estado: 'ACTIVO' },
      select: {
        id: true,
        productoId: true,
        prices: {
          where: { priceList: { isDefault: true, estado: 'ACTIVO' } },
          orderBy: { minQuantity: 'asc' },
          take: 1,
          select: { monto: true },
        },
      },
    });
    return new Map(
      variantes.map((v) => [
        v.id,
        {
          productoId: v.productoId,
          precio: v.prices[0]?.monto ?? new Prisma.Decimal(0),
        },
      ]),
    );
  }

  private async exigirProductosDeEmpresa(
    tx: TxPrisma,
    inquilinoId: string,
    productoIds: string[],
  ): Promise<void> {
    const ids = [...new Set(productoIds)];
    const encontrados = await tx.product.count({
      where: { inquilinoId, id: { in: ids } },
    });
    if (encontrados !== ids.length) {
      throw new ConflictException(
        'Alguno de los productos indicados no existe',
      );
    }
  }

  /** Reglas mínimas de coherencia del beneficio. */
  private validarBeneficio(dto: {
    tipoBeneficio: string;
    valor?: number;
    compraCantidad?: number;
    pagaCantidad?: number;
  }): void {
    const requiereValor =
      dto.tipoBeneficio === 'PORCENTAJE' ||
      dto.tipoBeneficio === 'MONTO_FIJO' ||
      dto.tipoBeneficio === 'PRECIO_FIJO';
    if (requiereValor && (dto.valor === undefined || dto.valor < 0)) {
      throw new ConflictException(
        'El beneficio requiere un valor válido (%, monto o precio)',
      );
    }
    if (dto.tipoBeneficio === 'PORCENTAJE' && (dto.valor ?? 0) > 100) {
      throw new ConflictException('El porcentaje no puede superar 100');
    }
    if (dto.tipoBeneficio === 'LLEVA_N_PAGA_M') {
      const n = dto.compraCantidad ?? 0;
      const m = dto.pagaCantidad ?? 0;
      if (n < 1 || m < 0 || m >= n) {
        throw new ConflictException(
          'En "lleva N paga M" se requiere N ≥ 1 y M < N',
        );
      }
    }
  }
}
