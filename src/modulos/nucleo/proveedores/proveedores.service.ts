import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  ActualizarProveedorDto,
  CrearProveedorDto,
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
