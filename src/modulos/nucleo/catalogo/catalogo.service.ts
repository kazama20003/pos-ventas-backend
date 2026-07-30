import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { GatingService } from '../../administracion/suscripciones/gating.service';
import {
  CrearCategoriaDto,
  CrearImpuestoDto,
  CrearListaPreciosDto,
  CrearProductoDto,
  CrearUnidadMedidaDto,
} from './dto/catalogo.dto';

@Injectable()
export class CatalogoService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly gating: GatingService,
  ) {}

  async crearCategoria(dto: CrearCategoriaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      if (dto.padreId) await this.exigirCategoria(tx, inquilinoId, dto.padreId);
      return tx.category.create({
        data: { inquilinoId, ...dto, descripcion: dto.descripcion ?? null },
      });
    });
  }

  async listarCategorias() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.category.findMany({
        where: { inquilinoId },
        orderBy: [{ sortOrder: 'asc' }, { nombre: 'asc' }],
      }),
    );
  }

  async crearUnidad(dto: CrearUnidadMedidaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.unitOfMeasure.create({ data: { inquilinoId, ...dto } }),
    );
  }

  async listarUnidades() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.unitOfMeasure.findMany({
        where: { inquilinoId },
        orderBy: { codigo: 'asc' },
      }),
    );
  }

  async crearImpuesto(dto: CrearImpuestoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.tax.create({ data: { inquilinoId, ...dto } }),
    );
  }

  async listarImpuestos() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.tax.findMany({ where: { inquilinoId }, orderBy: { codigo: 'asc' } }),
    );
  }

  async crearProducto(dto: CrearProductoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();

    // Gating por plan (si está activo): no exceder el máximo de productos.
    const productos = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.product.count({ where: { inquilinoId } }),
    );
    await this.gating.exigir('productos_max', productos);

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirReferenciasProducto(tx, inquilinoId, dto);
      return tx.product.create({
        data: {
          inquilinoId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          descripcion: dto.descripcion ?? null,
          kind: dto.kind,
          categories: {
            create: (dto.categoriaIds ?? []).map((categoriaId, index) => ({
              inquilinoId,
              categoriaId,
              isPrimary: index === 0,
            })),
          },
          variants: {
            create: dto.variantes.map((variante) => ({
              inquilinoId,
              unidadMedidaId: variante.unidadMedidaId,
              sku: variante.sku,
              nombre: variante.nombre,
              cost: variante.cost ?? 0,
              isStockTracked: variante.isStockTracked ?? true,
              allowNegativeStock: variante.allowNegativeStock ?? false,
              taxes: {
                create: (variante.impuestoIds ?? []).map((taxId, index) => ({
                  inquilinoId,
                  taxId,
                  isPrimary: index === 0,
                })),
              },
            })),
          },
        },
        include: { categories: true, variants: { include: { taxes: true } } },
      });
    });
  }

  async listarProductos() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.product.findMany({
        where: { inquilinoId },
        include: {
          categories: { include: { category: true } },
          variants: {
            include: { unitOfMeasure: true, taxes: { include: { tax: true } } },
          },
        },
        orderBy: { nombre: 'asc' },
      }),
    );
  }

  async crearListaPrecios(dto: CrearListaPreciosDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const empresa = await tx.company.findFirst({
        where: { id: dto.empresaId, inquilinoId },
        select: { id: true },
      });
      if (!empresa) throw new NotFoundException('Empresa no encontrada');
      await this.exigirConteo(
        tx.productVariant,
        inquilinoId,
        dto.items.map((item) => item.varianteId),
        'Variante',
      );
      if (dto.isDefault) {
        await tx.priceList.updateMany({
          where: { inquilinoId, empresaId: dto.empresaId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.priceList.create({
        data: {
          inquilinoId,
          empresaId: dto.empresaId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          moneda: dto.moneda,
          isDefault: dto.isDefault ?? false,
          articulos: {
            create: dto.items.map((item) => ({
              inquilinoId,
              varianteId: item.varianteId,
              minQuantity: item.minQuantity ?? 1,
              monto: item.monto,
            })),
          },
        },
        include: { articulos: true },
      });
    });
  }

  async listarListasPrecios() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.priceList.findMany({
        where: { inquilinoId },
        include: { articulos: { include: { variant: true } } },
        orderBy: { codigo: 'asc' },
      }),
    );
  }

  private async exigirCategoria(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    categoriaId: string,
  ) {
    const categoria = await tx.category.findFirst({
      where: { id: categoriaId, inquilinoId },
      select: { id: true },
    });
    if (!categoria)
      throw new NotFoundException('Categoría padre no encontrada');
  }

  private async exigirReferenciasProducto(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    dto: CrearProductoDto,
  ) {
    await this.exigirConteo(
      tx.category,
      inquilinoId,
      dto.categoriaIds ?? [],
      'Categoría',
    );
    await this.exigirConteo(
      tx.unitOfMeasure,
      inquilinoId,
      dto.variantes.map((variante) => variante.unidadMedidaId),
      'Unidad de medida',
    );
    await this.exigirConteo(
      tx.tax,
      inquilinoId,
      dto.variantes.flatMap((variante) => variante.impuestoIds ?? []),
      'Impuesto',
    );
  }

  private async exigirConteo(
    delegate: {
      count: (args: {
        where: { inquilinoId: string; id: { in: string[] } };
      }) => Promise<number>;
    },
    inquilinoId: string,
    ids: string[],
    entidad: string,
  ) {
    const unicos = [...new Set(ids)];
    if (!unicos.length) return;
    const encontrados = await delegate.count({
      where: { inquilinoId, id: { in: unicos } },
    });
    if (encontrados !== unicos.length)
      throw new BadRequestException(
        `${entidad} no encontrada o no pertenece al inquilino`,
      );
  }
}
