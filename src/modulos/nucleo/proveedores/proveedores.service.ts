import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  ActualizarProductoProveedorDto,
  ActualizarProveedorDto,
  CrearProveedorDto,
  VincularProductoProveedorDto,
} from './dto/proveedores.dto';

/** Módulo G (parte 1) — CRUD de proveedores. */
@Injectable()
export class ProveedoresService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crear(dto: CrearProveedorDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const duplicado = await tx.supplier.findFirst({
        where: { inquilinoId, codigo: dto.codigo },
        select: { id: true },
      });
      if (duplicado) {
        throw new ConflictException(
          `Ya existe un proveedor con código ${dto.codigo}`,
        );
      }
      return tx.supplier.create({
        data: {
          inquilinoId,
          codigo: dto.codigo,
          documentType: dto.documentType ?? null,
          documentNumber: dto.documentNumber ?? null,
          razonSocial: dto.razonSocial,
          nombreComercial: dto.nombreComercial ?? null,
          contactName: dto.contactName ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
          moneda: dto.moneda ?? 'PEN',
          paymentTermDays: dto.paymentTermDays ?? 0,
        },
        select: { id: true, codigo: true, razonSocial: true, estado: true },
      });
    });
  }

  async listar(q?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.supplier.findMany({
        where: {
          inquilinoId,
          estado: { not: 'ELIMINADO' },
          ...(q
            ? {
                OR: [
                  { razonSocial: { contains: q, mode: 'insensitive' } },
                  { codigo: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { razonSocial: 'asc' },
        take: 100,
        select: {
          id: true,
          codigo: true,
          razonSocial: true,
          documentNumber: true,
          email: true,
          phone: true,
          paymentTermDays: true,
          estado: true,
        },
      }),
    );
  }

  async obtener(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const proveedor = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.supplier.findFirst({ where: { id, inquilinoId } }),
    );
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async actualizar(id: string, dto: ActualizarProveedorDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigir(tx, inquilinoId, id);
      return tx.supplier.update({
        where: { id },
        data: {
          razonSocial: dto.razonSocial ?? undefined,
          contactName: dto.contactName ?? undefined,
          email: dto.email ?? undefined,
          phone: dto.phone ?? undefined,
          paymentTermDays: dto.paymentTermDays ?? undefined,
        },
        select: { id: true, razonSocial: true, estado: true },
      });
    });
  }

  async desactivar(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigir(tx, inquilinoId, id);
      await tx.supplier.update({ where: { id }, data: { estado: 'INACTIVO' } });
      return { id, estado: 'INACTIVO' as const };
    });
  }

  // --- Catálogo de aprovisionamiento (qué proveedor surte qué variante) ---

  /** Vincula una variante a un proveedor con su costo/SKU/lead time. */
  async vincularProducto(
    proveedorId: string,
    dto: VincularProductoProveedorDto,
  ) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigir(tx, inquilinoId, proveedorId);
      const variante = await tx.productVariant.findFirst({
        where: { id: dto.varianteId, inquilinoId },
        select: { id: true },
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');

      const duplicado = await tx.supplierProduct.findFirst({
        where: { inquilinoId, proveedorId, varianteId: dto.varianteId },
        select: { id: true },
      });
      if (duplicado) {
        throw new ConflictException(
          'La variante ya está vinculada a este proveedor',
        );
      }

      if (dto.isPreferred) {
        await this.limpiarPreferido(tx, inquilinoId, dto.varianteId);
      }

      return tx.supplierProduct.create({
        data: {
          inquilinoId,
          proveedorId,
          varianteId: dto.varianteId,
          supplierSku: dto.supplierSku ?? null,
          costo: new Prisma.Decimal(dto.costo),
          moneda: dto.moneda ?? 'PEN',
          leadTimeDays: dto.leadTimeDays ?? 0,
          minOrderQty: new Prisma.Decimal(dto.minOrderQty ?? 1),
          isPreferred: dto.isPreferred ?? false,
        },
        select: { id: true, varianteId: true, isPreferred: true },
      });
    });
  }

  /** Variantes surtidas por un proveedor. */
  async listarProductos(proveedorId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigir(tx, inquilinoId, proveedorId);
      const filas = await tx.supplierProduct.findMany({
        where: { inquilinoId, proveedorId, estado: { not: 'ELIMINADO' } },
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          varianteId: true,
          supplierSku: true,
          costo: true,
          moneda: true,
          leadTimeDays: true,
          minOrderQty: true,
          isPreferred: true,
          variant: {
            select: {
              sku: true,
              nombre: true,
              product: { select: { codigo: true, nombre: true } },
            },
          },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        varianteId: f.varianteId,
        sku: f.variant.sku,
        nombreVariante: f.variant.nombre,
        productoCodigo: f.variant.product.codigo,
        productoNombre: f.variant.product.nombre,
        supplierSku: f.supplierSku,
        costo: f.costo.toFixed(6),
        moneda: f.moneda,
        leadTimeDays: f.leadTimeDays,
        minOrderQty: f.minOrderQty.toFixed(6),
        isPreferred: f.isPreferred,
      }));
    });
  }

  /** Proveedores que surten una variante (para el módulo de compras). */
  async proveedoresDeVariante(varianteId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.supplierProduct.findMany({
        where: { inquilinoId, varianteId, estado: { not: 'ELIMINADO' } },
        orderBy: [{ isPreferred: 'desc' }, { costo: 'asc' }],
        select: {
          id: true,
          proveedorId: true,
          supplierSku: true,
          costo: true,
          moneda: true,
          leadTimeDays: true,
          minOrderQty: true,
          isPreferred: true,
          supplier: { select: { codigo: true, razonSocial: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        proveedorId: f.proveedorId,
        proveedorCodigo: f.supplier.codigo,
        proveedorRazonSocial: f.supplier.razonSocial,
        supplierSku: f.supplierSku,
        costo: f.costo.toFixed(6),
        moneda: f.moneda,
        leadTimeDays: f.leadTimeDays,
        minOrderQty: f.minOrderQty.toFixed(6),
        isPreferred: f.isPreferred,
      }));
    });
  }

  async actualizarProducto(
    proveedorId: string,
    varianteId: string,
    dto: ActualizarProductoProveedorDto,
  ) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const vinculo = await tx.supplierProduct.findFirst({
        where: { inquilinoId, proveedorId, varianteId },
        select: { id: true },
      });
      if (!vinculo) throw new NotFoundException('Vínculo no encontrado');

      if (dto.isPreferred) {
        await this.limpiarPreferido(tx, inquilinoId, varianteId);
      }

      return tx.supplierProduct.update({
        where: { id: vinculo.id },
        data: {
          supplierSku: dto.supplierSku ?? undefined,
          costo:
            dto.costo !== undefined ? new Prisma.Decimal(dto.costo) : undefined,
          moneda: dto.moneda ?? undefined,
          leadTimeDays: dto.leadTimeDays ?? undefined,
          minOrderQty:
            dto.minOrderQty !== undefined
              ? new Prisma.Decimal(dto.minOrderQty)
              : undefined,
          isPreferred: dto.isPreferred ?? undefined,
        },
        select: { id: true, varianteId: true, isPreferred: true },
      });
    });
  }

  async desvincularProducto(proveedorId: string, varianteId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const vinculo = await tx.supplierProduct.findFirst({
        where: { inquilinoId, proveedorId, varianteId },
        select: { id: true },
      });
      if (!vinculo) throw new NotFoundException('Vínculo no encontrado');
      await tx.supplierProduct.delete({ where: { id: vinculo.id } });
      return { proveedorId, varianteId, desvinculado: true };
    });
  }

  /** Desmarca el proveedor preferido actual de una variante (solo uno puede serlo). */
  private async limpiarPreferido(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    varianteId: string,
  ) {
    await tx.supplierProduct.updateMany({
      where: { inquilinoId, varianteId, isPreferred: true },
      data: { isPreferred: false },
    });
  }

  private async exigir(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    id: string,
  ) {
    const proveedor = await tx.supplier.findFirst({
      where: { id, inquilinoId },
      select: { id: true },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
  }
}
