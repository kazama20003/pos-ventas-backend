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
  ActualizarCategoriaDto,
  ActualizarProductoDto,
  ActualizarUnidadMedidaDto,
  ActualizarVarianteDto,
  AgregarCodigoBarrasDto,
  CrearCategoriaDto,
  CrearVarianteProductoDto,
  CrearImpuestoDto,
  CrearListaPreciosDto,
  CrearMarcaDto,
  CrearProductoDto,
  CrearUnidadMedidaDto,
  ImportarProductosDto,
  ListarProductosQueryDto,
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
        where: { inquilinoId, estado: { not: 'ARCHIVADO' } },
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
        where: { inquilinoId, estado: { not: 'ARCHIVADO' } },
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

  // ----------------------- Marcas -----------------------

  async crearMarca(dto: CrearMarcaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const codigo = dto.codigo?.trim()
        ? dto.codigo.trim()
        : await this.generarCodigoUnico(
            async (base) =>
              (
                await tx.brand.findMany({
                  where: { inquilinoId, codigo: { startsWith: base } },
                  select: { codigo: true },
                })
              ).map((f) => f.codigo),
            this.aSlug(dto.nombre) || 'MARCA',
          );
      try {
        return await tx.brand.create({
          data: { inquilinoId, codigo, nombre: dto.nombre.trim() },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        )
          throw new BadRequestException('Ya existe una marca con ese código');
        throw e;
      }
    });
  }

  async listarMarcas() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.brand.findMany({
        where: { inquilinoId, estado: { not: 'ARCHIVADO' } },
        orderBy: { nombre: 'asc' },
      }),
    );
  }

  // --------------------- Importación masiva ---------------------

  /**
   * Importa productos desde filas (el frontend parsea el CSV). Cada fila es
   * independiente: si una falla, las demás igual se crean. Devuelve un resumen
   * con los errores por número de fila.
   */
  async importarProductos(dto: ImportarProductosDto) {
    const cacheUnidad = new Map<string, string>();
    const cacheCategoria = new Map<string, string>();
    const cacheMarca = new Map<string, string>();
    const cacheImpuesto = new Map<string, string | null>();

    const errores: { fila: number; nombre: string; error: string }[] = [];
    let creados = 0;

    for (let i = 0; i < dto.filas.length; i++) {
      const f = dto.filas[i];
      try {
        if (!f.nombre?.trim()) throw new BadRequestException('Falta el nombre');

        const unidadMedidaId = await this.resolverUnidad(f.unidad, cacheUnidad);
        const categoriaId = f.categoria?.trim()
          ? await this.resolverCategoria(f.categoria, cacheCategoria)
          : undefined;
        const marcaId = f.marca?.trim()
          ? await this.resolverMarca(f.marca, cacheMarca)
          : undefined;
        const impuestoId = f.impuesto?.trim()
          ? await this.resolverImpuesto(f.impuesto, cacheImpuesto)
          : null;

        await this.crearProducto({
          codigo: f.codigo?.trim() || undefined,
          nombre: f.nombre.trim(),
          marcaId,
          categoriaIds: categoriaId ? [categoriaId] : [],
          almacenId: dto.almacenId,
          variantes: [
            {
              unidadMedidaId,
              nombre: f.nombre.trim(),
              precio: f.precio,
              cost: f.costo,
              barcode: f.barcode?.trim() || undefined,
              stockInicial: f.stockInicial,
              impuestoIds: impuestoId ? [impuestoId] : [],
            },
          ],
        });
        creados++;
      } catch (e) {
        const error =
          e instanceof Error ? e.message : 'Error desconocido al importar';
        errores.push({ fila: i + 1, nombre: f.nombre ?? '', error });
      }
    }

    return { total: dto.filas.length, creados, errores };
  }

  /** Encuentra la unidad por código/símbolo/nombre; si no existe, la crea. */
  private async resolverUnidad(
    texto: string | undefined,
    cache: Map<string, string>,
  ): Promise<string> {
    const t = (texto ?? 'unidad').trim();
    const clave = t.toLowerCase();
    const cached = cache.get(clave);
    if (cached) return cached;

    const id = await this.prisma.ejecutarEnTenant(
      this.contexto.obtenerObligatorio().inquilinoId,
      async (tx) => {
        const inquilinoId = this.contexto.obtenerObligatorio().inquilinoId;
        const existente = await tx.unitOfMeasure.findFirst({
          where: {
            inquilinoId,
            estado: { not: 'ARCHIVADO' },
            OR: [
              { codigo: { equals: t, mode: 'insensitive' } },
              { symbol: { equals: t, mode: 'insensitive' } },
              { nombre: { equals: t, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (existente) return existente.id;
        const codigo = await this.generarCodigoUnico(
          async (base) =>
            (
              await tx.unitOfMeasure.findMany({
                where: { inquilinoId, codigo: { startsWith: base } },
                select: { codigo: true },
              })
            ).map((r) => r.codigo),
          this.aSlug(t) || 'UND',
        );
        const creada = await tx.unitOfMeasure.create({
          data: {
            inquilinoId,
            codigo,
            sunatCode: 'NIU',
            nombre: t,
            symbol: t.slice(0, 8),
          },
          select: { id: true },
        });
        return creada.id;
      },
    );
    cache.set(clave, id);
    return id;
  }

  private async resolverCategoria(
    nombre: string,
    cache: Map<string, string>,
  ): Promise<string> {
    const clave = nombre.trim().toLowerCase();
    const cached = cache.get(clave);
    if (cached) return cached;
    const inquilinoId = this.contexto.obtenerObligatorio().inquilinoId;
    const id = await this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.category.findFirst({
        where: {
          inquilinoId,
          estado: { not: 'ARCHIVADO' },
          nombre: { equals: nombre.trim(), mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (existente) return existente.id;
      const codigo = await this.generarCodigoUnico(
        async (base) =>
          (
            await tx.category.findMany({
              where: { inquilinoId, codigo: { startsWith: base } },
              select: { codigo: true },
            })
          ).map((r) => r.codigo),
        this.aSlug(nombre) || 'CAT',
      );
      const creada = await tx.category.create({
        data: { inquilinoId, codigo, nombre: nombre.trim() },
        select: { id: true },
      });
      return creada.id;
    });
    cache.set(clave, id);
    return id;
  }

  private async resolverMarca(
    nombre: string,
    cache: Map<string, string>,
  ): Promise<string> {
    const clave = nombre.trim().toLowerCase();
    const cached = cache.get(clave);
    if (cached) return cached;
    const inquilinoId = this.contexto.obtenerObligatorio().inquilinoId;
    const id = await this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.brand.findFirst({
        where: {
          inquilinoId,
          estado: { not: 'ARCHIVADO' },
          nombre: { equals: nombre.trim(), mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (existente) return existente.id;
      const codigo = await this.generarCodigoUnico(
        async (base) =>
          (
            await tx.brand.findMany({
              where: { inquilinoId, codigo: { startsWith: base } },
              select: { codigo: true },
            })
          ).map((r) => r.codigo),
        this.aSlug(nombre) || 'MARCA',
      );
      const creada = await tx.brand.create({
        data: { inquilinoId, codigo, nombre: nombre.trim() },
        select: { id: true },
      });
      return creada.id;
    });
    cache.set(clave, id);
    return id;
  }

  /** Busca impuesto por código (no lo crea: los tributos son fiscales). */
  private async resolverImpuesto(
    codigo: string,
    cache: Map<string, string | null>,
  ): Promise<string | null> {
    const clave = codigo.trim().toLowerCase();
    if (cache.has(clave)) return cache.get(clave)!;
    const inquilinoId = this.contexto.obtenerObligatorio().inquilinoId;
    const id = await this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const t = await tx.tax.findFirst({
        where: {
          inquilinoId,
          codigo: { equals: codigo.trim(), mode: 'insensitive' },
        },
        select: { id: true },
      });
      return t?.id ?? null;
    });
    cache.set(clave, id);
    return id;
  }

  // --------------- Editar / archivar categorías ---------------

  async actualizarCategoria(id: string, dto: ActualizarCategoriaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const cat = await tx.category.findFirst({ where: { id, inquilinoId } });
      if (!cat) throw new NotFoundException('Categoría no encontrada');
      if (dto.padreId) {
        if (dto.padreId === id)
          throw new BadRequestException('Una categoría no puede ser su propio padre');
        await this.exigirCategoria(tx, inquilinoId, dto.padreId);
      }
      try {
        return await tx.category.update({
          where: { id },
          data: {
            codigo: dto.codigo?.trim(),
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            padreId: dto.padreId,
            sortOrder: dto.sortOrder,
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        )
          throw new BadRequestException('Ya existe una categoría con ese código');
        throw e;
      }
    });
  }

  async archivarCategoria(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const cat = await tx.category.findFirst({
        where: { id, inquilinoId },
        include: { _count: { select: { products: true, children: true } } },
      });
      if (!cat) throw new NotFoundException('Categoría no encontrada');
      if (cat._count.children > 0)
        throw new BadRequestException(
          'La categoría tiene subcategorías; muévelas o elimínalas primero',
        );
      // Se archiva (borrado lógico) y se desligan sus productos.
      await tx.productCategory.deleteMany({ where: { categoriaId: id, inquilinoId } });
      await tx.category.update({ where: { id }, data: { estado: 'ARCHIVADO' } });
      return { id, estado: 'ARCHIVADO' as const };
    });
  }

  // --------------- Editar / archivar unidades ---------------

  async actualizarUnidad(id: string, dto: ActualizarUnidadMedidaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const u = await tx.unitOfMeasure.findFirst({ where: { id, inquilinoId } });
      if (!u) throw new NotFoundException('Unidad de medida no encontrada');
      return tx.unitOfMeasure.update({
        where: { id },
        data: { nombre: dto.nombre, symbol: dto.symbol, decimals: dto.decimals },
      });
    });
  }

  async archivarUnidad(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const u = await tx.unitOfMeasure.findFirst({
        where: { id, inquilinoId },
        include: { _count: { select: { variants: true } } },
      });
      if (!u) throw new NotFoundException('Unidad de medida no encontrada');
      if (u._count.variants > 0)
        throw new BadRequestException(
          'La unidad está en uso por productos; no se puede eliminar',
        );
      await tx.unitOfMeasure.update({ where: { id }, data: { estado: 'ARCHIVADO' } });
      return { id, estado: 'ARCHIVADO' as const };
    });
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

      // Código de producto: respeta el enviado; si no, lo genera del nombre.
      const codigo = dto.codigo?.trim()
        ? dto.codigo.trim()
        : await this.generarCodigoUnico(
            async (base) =>
              (
                await tx.product.findMany({
                  where: { inquilinoId, codigo: { startsWith: base } },
                  select: { codigo: true },
                })
              ).map((f) => f.codigo),
            this.aSlug(dto.nombre) || 'PROD',
          );

      // SKU por variante: respeta el enviado; si no, lo deriva del código
      // (una variante → SKU = código; varias → código-2, código-3, …).
      const skus: string[] = [];
      for (let i = 0; i < dto.variantes.length; i++) {
        const enviado = dto.variantes[i].sku?.trim();
        const base = enviado || (i === 0 ? codigo : `${codigo}-${i + 1}`);
        skus.push(
          enviado
            ? enviado
            : await this.generarCodigoUnico(
                async (b) =>
                  (
                    await tx.productVariant.findMany({
                      where: { inquilinoId, sku: { startsWith: b } },
                      select: { sku: true },
                    })
                  ).map((f) => f.sku),
                base,
                skus,
              ),
        );
      }

      let creado;
      try {
        creado = await tx.product.create({
          data: {
            inquilinoId,
            codigo,
            nombre: dto.nombre,
            descripcion: dto.descripcion ?? null,
            imagenUrl: dto.imagenUrl?.trim() || null,
            marcaId: dto.marcaId ?? null,
            kind: dto.kind,
            categories: {
              create: (dto.categoriaIds ?? []).map((categoriaId, index) => ({
                inquilinoId,
                categoriaId,
                isPrimary: index === 0,
              })),
            },
            variants: {
              create: dto.variantes.map((variante, index) => ({
                inquilinoId,
                unidadMedidaId: variante.unidadMedidaId,
                sku: skus[index],
                nombre: variante.nombre,
                cost: variante.cost ?? 0,
                attributes: variante.atributos ?? undefined,
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
      } catch (e) {
        throw this.traducirConflicto(e);
      }

      // --- Extras por variante: código de barras, precio de venta y stock. ---
      const porSku = new Map<string, string>(
        creado.variants.map((v) => [v.sku, v.id] as [string, string]),
      );
      let lista: { id: string } | null = null; // lista de precios (perezosa)
      let almacenId: string | null = null; // almacén de apertura (perezoso)

      for (let i = 0; i < dto.variantes.length; i++) {
        const v = dto.variantes[i];
        const varianteId = porSku.get(skus[i])!;

        await this.agregarBarcodesVariante(tx, inquilinoId, varianteId, v);

        if (v.precio !== undefined && v.precio !== null) {
          if (!lista)
            lista = await this.resolverListaPreciosPredeterminada(tx, inquilinoId);
          await tx.priceListItem.create({
            data: {
              inquilinoId,
              listaPreciosId: lista.id,
              varianteId,
              minQuantity: 1,
              monto: new Prisma.Decimal(v.precio),
            },
          });
        }

        if (v.stockInicial && v.stockInicial > 0) {
          if (v.isStockTracked === false)
            throw new BadRequestException(
              'No se puede cargar stock a una variante que no controla inventario',
            );
          if (!almacenId)
            almacenId = await this.resolverAlmacen(tx, inquilinoId, dto.almacenId);
          await this.cargarStockInicial(
            tx,
            inquilinoId,
            almacenId,
            varianteId,
            v.stockInicial,
            v.cost ?? 0,
          );
        }
      }

      // --- Componentes del combo (kind = PAQUETE). ---
      if (dto.componentes?.length) {
        await this.exigirConteo(
          tx.productVariant,
          inquilinoId,
          dto.componentes.map((c) => c.varianteId),
          'Variante del combo',
        );
        await tx.productBundleItem.createMany({
          data: dto.componentes.map((c) => ({
            inquilinoId,
            bundleProductId: creado.id,
            componentVariantId: c.varianteId,
            cantidad: new Prisma.Decimal(c.cantidad),
          })),
          skipDuplicates: true,
        });
      }

      return this.obtenerProductoTx(tx, inquilinoId, creado.id);
    });
  }

  async listarProductos(query: ListarProductosQueryDto = {}) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 30, 100);
    const q = query.q?.trim();

    const where: Prisma.ProductWhereInput = {
      inquilinoId,
      estado: { notIn: ['ARCHIVADO', 'ELIMINADO'] },
      ...(query.marcaId ? { marcaId: query.marcaId } : {}),
      ...(query.categoriaId
        ? { categories: { some: { categoriaId: query.categoriaId } } }
        : {}),
      ...(query.conStock
        ? {
            variants: {
              some: { saldosInventario: { some: { available: { gt: 0 } } } },
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' } },
              { codigo: { contains: q, mode: 'insensitive' } },
              {
                variants: {
                  some: {
                    OR: [
                      { sku: { contains: q, mode: 'insensitive' } },
                      {
                        barcodigos: {
                          some: { codigo: { contains: q, mode: 'insensitive' } },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      // Secuencial: la transacción interactiva comparte una sola conexión pg.
      const total = await tx.product.count({ where });
      const items = await tx.product.findMany({
        where,
        include: this.incluirProducto(),
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

  /**
   * Genera un código de barras EAN-13 "interno" válido y único por inquilino.
   * Usa el prefijo 2 (reservado para uso interno de tienda) + 11 dígitos + el
   * dígito verificador EAN-13. Sirve para productos sin código de fábrica
   * (granel, panadería, cocina): se imprime la etiqueta y se escanea igual.
   */
  async generarCodigoBarrasInterno(): Promise<{
    codigo: string;
    tipo: 'EAN13';
  }> {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      for (let intento = 0; intento < 20; intento++) {
        // Prefijo 2 + 11 dígitos aleatorios = 12; luego el verificador.
        let base = '2';
        for (let i = 0; i < 11; i++)
          base += Math.floor(Math.random() * 10).toString();
        const codigo = base + this.digitoVerificadorEan13(base);

        const existe = await tx.productBarcodigo.findFirst({
          where: { inquilinoId, codigo },
          select: { id: true },
        });
        if (!existe) return { codigo, tipo: 'EAN13' as const };
      }
      throw new BadRequestException(
        'No se pudo generar un código único, intenta de nuevo',
      );
    });
  }

  /** Dígito verificador EAN-13 sobre los primeros 12 dígitos. */
  private digitoVerificadorEan13(doce: string): string {
    let suma = 0;
    for (let i = 0; i < 12; i++) {
      const d = doce.charCodeAt(i) - 48;
      suma += i % 2 === 0 ? d : d * 3;
    }
    return ((10 - (suma % 10)) % 10).toString();
  }

  /** Búsqueda por código de barras (para el escáner en caja). */
  async buscarPorCodigoBarras(codigo: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const barra = await tx.productBarcodigo.findFirst({
        where: { inquilinoId, codigo: codigo.trim() },
        select: { variant: { select: { productoId: true } } },
      });
      if (!barra)
        throw new NotFoundException('No hay ningún producto con ese código de barras');
      return this.obtenerProductoTx(tx, inquilinoId, barra.variant.productoId);
    });
  }

  async obtenerProducto(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const producto = await tx.product.findFirst({
        where: { id, inquilinoId },
        include: this.incluirProducto(),
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      return producto;
    });
  }

  async actualizarProducto(id: string, dto: ActualizarProductoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const producto = await tx.product.findFirst({
        where: { id, inquilinoId },
        include: { variants: { orderBy: { creadoEn: 'asc' }, take: 1 } },
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');

      // Validar referencias que se vayan a tocar.
      await this.exigirConteo(tx.category, inquilinoId, dto.categoriaIds ?? [], 'Categoría');
      if (dto.unidadMedidaId)
        await this.exigirConteo(tx.unitOfMeasure, inquilinoId, [dto.unidadMedidaId], 'Unidad de medida');
      await this.exigirConteo(tx.tax, inquilinoId, dto.impuestoIds ?? [], 'Impuesto');
      if (dto.marcaId)
        await this.exigirConteo(tx.brand, inquilinoId, [dto.marcaId], 'Marca');

      // Datos a nivel producto. imagenUrl/marcaId = "" o cadena para quitar.
      try {
        await tx.product.update({
          where: { id },
          data: {
            codigo: dto.codigo?.trim(),
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            kind: dto.kind,
            marcaId: dto.marcaId === undefined ? undefined : dto.marcaId || null,
            imagenUrl:
              dto.imagenUrl === undefined ? undefined : dto.imagenUrl.trim() || null,
          },
        });
      } catch (e) {
        throw this.traducirConflicto(e);
      }

      // Reemplazar categorías si se enviaron.
      if (dto.categoriaIds) {
        await tx.productCategory.deleteMany({ where: { productoId: id, inquilinoId } });
        if (dto.categoriaIds.length)
          await tx.productCategory.createMany({
            data: dto.categoriaIds.map((categoriaId, index) => ({
              inquilinoId,
              productoId: id,
              categoriaId,
              isPrimary: index === 0,
            })),
          });
      }

      // Variante principal (costo, unidad, impuestos, precio, código de barras).
      const variante = producto.variants[0];
      if (variante) {
        if (dto.cost !== undefined || dto.unidadMedidaId || dto.nombre) {
          await tx.productVariant.update({
            where: { id: variante.id },
            data: {
              cost: dto.cost,
              unidadMedidaId: dto.unidadMedidaId,
              nombre: dto.nombre,
            },
          });
        }

        if (dto.impuestoIds) {
          await tx.productVariantTax.deleteMany({
            where: { varianteId: variante.id, inquilinoId },
          });
          if (dto.impuestoIds.length)
            await tx.productVariantTax.createMany({
              data: dto.impuestoIds.map((taxId, index) => ({
                inquilinoId,
                varianteId: variante.id,
                taxId,
                isPrimary: index === 0,
              })),
            });
        }

        // Precio de venta: actualiza (o crea) el ítem en la lista por defecto.
        if (dto.precio !== undefined && dto.precio !== null) {
          const lista = await this.resolverListaPreciosPredeterminada(tx, inquilinoId);
          const monto = new Prisma.Decimal(dto.precio);
          const existente = await tx.priceListItem.findFirst({
            where: {
              inquilinoId,
              listaPreciosId: lista.id,
              varianteId: variante.id,
              minQuantity: 1,
            },
            select: { id: true },
          });
          if (existente)
            await tx.priceListItem.update({
              where: { id: existente.id },
              data: { monto },
            });
          else
            await tx.priceListItem.create({
              data: {
                inquilinoId,
                listaPreciosId: lista.id,
                varianteId: variante.id,
                minQuantity: 1,
                monto,
              },
            });
        }

        // Código de barras principal: reemplaza el existente si se envió.
        if (dto.barcode !== undefined) {
          await tx.productBarcodigo.deleteMany({
            where: { varianteId: variante.id, inquilinoId, isPrimary: true },
          });
          if (dto.barcode.trim()) {
            try {
              await tx.productBarcodigo.create({
                data: {
                  inquilinoId,
                  varianteId: variante.id,
                  codigo: dto.barcode.trim(),
                  tipo: dto.barcodeTipo ?? 'INTERNO',
                  isPrimary: true,
                },
              });
            } catch (e) {
              if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002'
              )
                throw new BadRequestException(
                  `El código de barras "${dto.barcode.trim()}" ya está en uso`,
                );
              throw e;
            }
          }
        }
      }

      // Componentes del combo: si se envían, reemplazan el set completo.
      if (dto.componentes) {
        await this.exigirConteo(
          tx.productVariant,
          inquilinoId,
          dto.componentes.map((c) => c.varianteId),
          'Variante del combo',
        );
        await tx.productBundleItem.deleteMany({
          where: { bundleProductId: id, inquilinoId },
        });
        if (dto.componentes.length)
          await tx.productBundleItem.createMany({
            data: dto.componentes.map((c) => ({
              inquilinoId,
              bundleProductId: id,
              componentVariantId: c.varianteId,
              cantidad: new Prisma.Decimal(c.cantidad),
            })),
            skipDuplicates: true,
          });
      }

      return this.obtenerProductoTx(tx, inquilinoId, id);
    });
  }

  // Borrado lógico: el producto pasa a ARCHIVADO, no se elimina físicamente.
  async archivarProducto(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const producto = await tx.product.findFirst({ where: { id, inquilinoId } });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      await tx.product.update({ where: { id }, data: { estado: 'ARCHIVADO' } });
      return { id, estado: 'ARCHIVADO' as const };
    });
  }

  // ==================== Variantes (múltiples) ====================

  async agregarVariante(productoId: string, dto: CrearVarianteProductoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const producto = await tx.product.findFirst({
        where: { id: productoId, inquilinoId },
        select: { id: true, codigo: true },
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      await this.exigirConteo(tx.unitOfMeasure, inquilinoId, [dto.unidadMedidaId], 'Unidad de medida');
      await this.exigirConteo(tx.tax, inquilinoId, dto.impuestoIds ?? [], 'Impuesto');

      const sku = dto.sku?.trim()
        ? dto.sku.trim()
        : await this.generarCodigoUnico(
            async (base) =>
              (
                await tx.productVariant.findMany({
                  where: { inquilinoId, sku: { startsWith: base } },
                  select: { sku: true },
                })
              ).map((r) => r.sku),
            producto.codigo,
          );

      let variante;
      try {
        variante = await tx.productVariant.create({
          data: {
            inquilinoId,
            productoId,
            unidadMedidaId: dto.unidadMedidaId,
            sku,
            nombre: dto.nombre,
            cost: dto.cost ?? 0,
            attributes: dto.atributos ?? undefined,
            isStockTracked: dto.isStockTracked ?? true,
            allowNegativeStock: dto.allowNegativeStock ?? false,
            taxes: {
              create: (dto.impuestoIds ?? []).map((taxId, index) => ({
                inquilinoId,
                taxId,
                isPrimary: index === 0,
              })),
            },
          },
          select: { id: true },
        });
      } catch (e) {
        throw this.traducirConflicto(e);
      }

      await this.agregarBarcodesVariante(tx, inquilinoId, variante.id, dto);
      if (dto.precio !== undefined && dto.precio !== null)
        await this.fijarPrecioVariante(tx, inquilinoId, variante.id, dto.precio);
      if (dto.stockInicial && dto.stockInicial > 0) {
        const almacenId = await this.resolverAlmacen(tx, inquilinoId, undefined);
        await this.cargarStockInicial(
          tx,
          inquilinoId,
          almacenId,
          variante.id,
          dto.stockInicial,
          dto.cost ?? 0,
        );
      }
      return this.obtenerProductoTx(tx, inquilinoId, productoId);
    });
  }

  async actualizarVariante(
    productoId: string,
    varianteId: string,
    dto: ActualizarVarianteDto,
  ) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const variante = await tx.productVariant.findFirst({
        where: { id: varianteId, productoId, inquilinoId },
        select: { id: true },
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');
      if (dto.unidadMedidaId)
        await this.exigirConteo(tx.unitOfMeasure, inquilinoId, [dto.unidadMedidaId], 'Unidad de medida');
      await this.exigirConteo(tx.tax, inquilinoId, dto.impuestoIds ?? [], 'Impuesto');

      try {
        await tx.productVariant.update({
          where: { id: varianteId },
          data: {
            nombre: dto.nombre,
            sku: dto.sku?.trim(),
            unidadMedidaId: dto.unidadMedidaId,
            cost: dto.cost,
            attributes: dto.atributos ?? undefined,
          },
        });
      } catch (e) {
        throw this.traducirConflicto(e);
      }

      if (dto.impuestoIds) {
        await tx.productVariantTax.deleteMany({ where: { varianteId, inquilinoId } });
        if (dto.impuestoIds.length)
          await tx.productVariantTax.createMany({
            data: dto.impuestoIds.map((taxId, index) => ({
              inquilinoId,
              varianteId,
              taxId,
              isPrimary: index === 0,
            })),
          });
      }
      if (dto.precio !== undefined && dto.precio !== null)
        await this.fijarPrecioVariante(tx, inquilinoId, varianteId, dto.precio);

      return this.obtenerProductoTx(tx, inquilinoId, productoId);
    });
  }

  async archivarVariante(productoId: string, varianteId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const variante = await tx.productVariant.findFirst({
        where: { id: varianteId, productoId, inquilinoId },
        select: { id: true },
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');
      const activas = await tx.productVariant.count({
        where: { productoId, inquilinoId, estado: { not: 'ARCHIVADO' } },
      });
      if (activas <= 1)
        throw new BadRequestException(
          'El producto debe tener al menos una variante activa',
        );
      await tx.productVariant.update({
        where: { id: varianteId },
        data: { estado: 'ARCHIVADO' },
      });
      return { id: varianteId, estado: 'ARCHIVADO' as const };
    });
  }

  // ==================== Códigos de barras (múltiples) ====================

  async agregarBarcode(varianteId: string, dto: AgregarCodigoBarrasDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const variante = await tx.productVariant.findFirst({
        where: { id: varianteId, inquilinoId },
        select: { id: true, productoId: true },
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');
      const existentes = await tx.productBarcodigo.count({
        where: { varianteId, inquilinoId },
      });
      try {
        await tx.productBarcodigo.create({
          data: {
            inquilinoId,
            varianteId,
            codigo: dto.codigo.trim(),
            tipo: dto.tipo ?? 'INTERNO',
            isPrimary: existentes === 0,
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
          throw new BadRequestException(
            `El código de barras "${dto.codigo.trim()}" ya está en uso`,
          );
        throw e;
      }
      return this.obtenerProductoTx(tx, inquilinoId, variante.productoId);
    });
  }

  async quitarBarcode(varianteId: string, barcodeId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const barra = await tx.productBarcodigo.findFirst({
        where: { id: barcodeId, varianteId, inquilinoId },
        select: { id: true, isPrimary: true, variant: { select: { productoId: true } } },
      });
      if (!barra) throw new NotFoundException('Código de barras no encontrado');
      await tx.productBarcodigo.delete({ where: { id: barcodeId } });
      // Si era el principal, promover otro a principal.
      if (barra.isPrimary) {
        const otro = await tx.productBarcodigo.findFirst({
          where: { varianteId, inquilinoId },
          select: { id: true },
        });
        if (otro)
          await tx.productBarcodigo.update({
            where: { id: otro.id },
            data: { isPrimary: true },
          });
      }
      return this.obtenerProductoTx(tx, inquilinoId, barra.variant.productoId);
    });
  }

  /** Crea los barcodes de una variante desde el DTO (array o single). */
  private async agregarBarcodesVariante(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    varianteId: string,
    v: CrearVarianteProductoDto,
  ) {
    const barras = (
      v.barcodes?.length
        ? v.barcodes.map((b) => ({ codigo: b.codigo, tipo: b.tipo }))
        : v.barcode
          ? [{ codigo: v.barcode, tipo: v.barcodeTipo }]
          : []
    )
      .map((b) => ({ codigo: b.codigo.trim(), tipo: b.tipo }))
      .filter((b) => b.codigo);
    for (let j = 0; j < barras.length; j++) {
      try {
        await tx.productBarcodigo.create({
          data: {
            inquilinoId,
            varianteId,
            codigo: barras[j].codigo,
            tipo: barras[j].tipo ?? 'INTERNO',
            isPrimary: j === 0,
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
          throw new BadRequestException(
            `El código de barras "${barras[j].codigo}" ya está en uso`,
          );
        throw e;
      }
    }
  }

  /** Fija (crea/actualiza) el precio de una variante en la lista por defecto. */
  private async fijarPrecioVariante(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    varianteId: string,
    precio: number,
  ) {
    const lista = await this.resolverListaPreciosPredeterminada(tx, inquilinoId);
    const monto = new Prisma.Decimal(precio);
    const existente = await tx.priceListItem.findFirst({
      where: { inquilinoId, listaPreciosId: lista.id, varianteId, minQuantity: 1 },
      select: { id: true },
    });
    if (existente)
      await tx.priceListItem.update({ where: { id: existente.id }, data: { monto } });
    else
      await tx.priceListItem.create({
        data: { inquilinoId, listaPreciosId: lista.id, varianteId, minQuantity: 1, monto },
      });
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

  /** Include estándar para devolver un producto "completo" en las respuestas. */
  private incluirProducto(): Prisma.ProductInclude {
    return {
      brand: true,
      categories: { include: { category: true } },
      variants: {
        where: { estado: { not: 'ARCHIVADO' } },
        orderBy: { creadoEn: 'asc' },
        include: {
          unitOfMeasure: true,
          taxes: { include: { tax: true } },
          barcodigos: true,
          prices: true,
          saldosInventario: {
            include: {
              warehouse: { select: { id: true, codigo: true, nombre: true } },
            },
          },
        },
      },
      bundleItems: { include: { componentVariant: true } },
    };
  }

  private async obtenerProductoTx(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    id: string,
  ) {
    return tx.product.findFirstOrThrow({
      where: { id, inquilinoId },
      include: this.incluirProducto(),
    });
  }

  /**
   * Devuelve (o crea) la lista de precios por defecto de la empresa del
   * inquilino. Para un POS típico con una sola empresa, esto hace que asignar
   * un precio al crear un producto "simplemente funcione".
   */
  private async resolverListaPreciosPredeterminada(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
  ): Promise<{ id: string }> {
    const empresa = await tx.company.findFirst({
      where: { inquilinoId },
      orderBy: { creadoEn: 'asc' },
      select: { id: true, moneda: true },
    });
    if (!empresa)
      throw new BadRequestException(
        'Crea una empresa antes de asignar precios de venta',
      );

    const existente = await tx.priceList.findFirst({
      where: {
        inquilinoId,
        empresaId: empresa.id,
        isDefault: true,
        estado: 'ACTIVO',
      },
      select: { id: true },
    });
    if (existente) return existente;

    const codigo = await this.generarCodigoUnico(
      async (base) =>
        (
          await tx.priceList.findMany({
            where: {
              inquilinoId,
              empresaId: empresa.id,
              codigo: { startsWith: base },
            },
            select: { codigo: true },
          })
        ).map((f) => f.codigo),
      'GENERAL',
    );
    return tx.priceList.create({
      data: {
        inquilinoId,
        empresaId: empresa.id,
        codigo,
        nombre: 'Lista de precios general',
        moneda: empresa.moneda,
        isDefault: true,
      },
      select: { id: true },
    });
  }

  /** Resuelve el almacén para el stock inicial (valida, o toma el único). */
  private async resolverAlmacen(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    almacenId?: string,
  ): Promise<string> {
    if (almacenId) {
      const w = await tx.warehouse.findFirst({
        where: { id: almacenId, inquilinoId, estado: 'ACTIVO' },
        select: { id: true },
      });
      if (!w) throw new NotFoundException('Almacén no encontrado');
      return w.id;
    }
    const almacenes = await tx.warehouse.findMany({
      where: { inquilinoId, estado: 'ACTIVO' },
      select: { id: true },
      take: 2,
    });
    if (!almacenes.length)
      throw new BadRequestException(
        'Crea un almacén antes de cargar stock inicial',
      );
    if (almacenes.length > 1)
      throw new BadRequestException(
        'Hay varios almacenes: indica en cuál cargar el stock inicial',
      );
    return almacenes[0].id;
  }

  /** Apertura de inventario: crea el saldo y su asiento inmutable. */
  private async cargarStockInicial(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    almacenId: string,
    varianteId: string,
    cantidad: number,
    costoUnitario: number,
  ) {
    const qty = new Prisma.Decimal(cantidad);
    const costo = new Prisma.Decimal(costoUnitario);
    await tx.stockBalance.create({
      data: {
        inquilinoId,
        almacenId,
        varianteId,
        enStock: qty,
        available: qty,
        costoPromedio: costo,
      },
    });
    await tx.inventoryLedgerEntry.create({
      data: {
        inquilinoId,
        almacenId,
        varianteId,
        movementType: 'APERTURA',
        cantidad: qty,
        costoUnitario: costo,
        totalCost: qty.mul(costo),
        referenciaType: 'APERTURA_INICIAL',
        referenciaId: varianteId,
        idempotencyKey: `apertura:${varianteId}:${almacenId}`,
        occurredAt: new Date(),
      },
    });
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

  /**
   * Convierte una violación de unicidad de Prisma (P2002) en un error de
   * negocio legible. Cualquier otro error se re-lanza tal cual.
   */
  private traducirConflicto(e: unknown): unknown {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      const campos = (e.meta?.target as string[] | undefined) ?? [];
      if (campos.some((c) => c.toLowerCase().includes('sku')))
        return new BadRequestException('Ya existe una variante con ese SKU');
      return new BadRequestException('Ya existe un producto con ese código');
    }
    return e;
  }

  /** "Café Americano" → "CAFE-AMERICANO". Base legible para códigos/SKU. */
  private aSlug(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
  }

  /**
   * Genera un identificador único por inquilino a partir de una base: usa
   * `base` si está libre; si no, prueba `base-2`, `base-3`, … Considera lo ya
   * guardado en BD (mismo prefijo) y los valores reservados en esta misma
   * transacción (`reservados`), para no colisionar entre variantes del mismo
   * producto antes de que se persistan.
   */
  private async generarCodigoUnico(
    buscarConPrefijo: (base: string) => Promise<string[]>,
    base: string,
    reservados: string[] = [],
  ): Promise<string> {
    const existentes = await buscarConPrefijo(base);
    const usados = new Set<string>([...existentes, ...reservados]);
    if (!usados.has(base)) return base;
    let n = 2;
    while (usados.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
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
    if (dto.marcaId)
      await this.exigirConteo(tx.brand, inquilinoId, [dto.marcaId], 'Marca');
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
