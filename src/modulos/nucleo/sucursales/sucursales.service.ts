import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { GatingService } from '../../administracion/suscripciones/gating.service';
import {
  CrearAlmacenDto,
  CrearCajaDto,
  CrearSucursalDto,
} from './dto/sucursales.dto';

/** CRUD de sucursales, almacenes y cajas del tenant. */
@Injectable()
export class SucursalesService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly gating: GatingService,
  ) {}

  async crearSucursal(dto: CrearSucursalDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();

    // Gating por plan (si está activo): límite de sucursales.
    const sucursales = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.branch.count({ where: { inquilinoId } }),
    );
    await this.gating.exigir('sucursales_max', sucursales);

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const empresa = await tx.company.findFirst({
        where: { id: dto.empresaId, inquilinoId },
        select: { id: true },
      });
      if (!empresa) throw new NotFoundException('Empresa no encontrada');
      await this.exigirUnico(
        tx.branch,
        inquilinoId,
        { empresaId: dto.empresaId, codigo: dto.codigo },
        'sucursal',
      );
      return tx.branch.create({
        data: {
          inquilinoId,
          empresaId: dto.empresaId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          sunatUbigeo: dto.sunatUbigeo ?? null,
          address: dto.address ?? null,
          phone: dto.phone ?? null,
        },
        select: { id: true, codigo: true, nombre: true, estado: true },
      });
    });
  }

  listarSucursales() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.branch.findMany({
        where: { inquilinoId },
        orderBy: { codigo: 'asc' },
        select: {
          id: true,
          empresaId: true,
          codigo: true,
          nombre: true,
          estado: true,
        },
      }),
    );
  }

  async crearAlmacen(dto: CrearAlmacenDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirSucursal(tx, inquilinoId, dto.sucursalId);
      await this.exigirUnico(
        tx.warehouse,
        inquilinoId,
        { sucursalId: dto.sucursalId, codigo: dto.codigo },
        'almacén',
      );
      return tx.warehouse.create({
        data: {
          inquilinoId,
          sucursalId: dto.sucursalId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          address: dto.address ?? null,
        },
        select: { id: true, codigo: true, nombre: true, estado: true },
      });
    });
  }

  listarAlmacenes(sucursalId?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.warehouse.findMany({
        where: { inquilinoId, sucursalId: sucursalId || undefined },
        orderBy: { codigo: 'asc' },
        select: {
          id: true,
          sucursalId: true,
          codigo: true,
          nombre: true,
          estado: true,
        },
      }),
    );
  }

  async crearCaja(dto: CrearCajaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirSucursal(tx, inquilinoId, dto.sucursalId);
      await this.exigirUnico(
        tx.cashRegister,
        inquilinoId,
        { sucursalId: dto.sucursalId, codigo: dto.codigo },
        'caja',
      );
      return tx.cashRegister.create({
        data: {
          inquilinoId,
          sucursalId: dto.sucursalId,
          codigo: dto.codigo,
          nombre: dto.nombre,
        },
        select: { id: true, codigo: true, nombre: true, estado: true },
      });
    });
  }

  listarCajas(sucursalId?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.cashRegister.findMany({
        where: { inquilinoId, sucursalId: sucursalId || undefined },
        orderBy: { codigo: 'asc' },
        select: {
          id: true,
          sucursalId: true,
          codigo: true,
          nombre: true,
          estado: true,
        },
      }),
    );
  }

  private async exigirSucursal(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    sucursalId: string,
  ) {
    const sucursal = await tx.branch.findFirst({
      where: { id: sucursalId, inquilinoId },
      select: { id: true },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
  }

  private async exigirUnico(
    delegate: {
      findFirst: (args: {
        where: Record<string, unknown>;
        select: { id: true };
      }) => Promise<{ id: string } | null>;
    },
    inquilinoId: string,
    filtro: Record<string, string>,
    entidad: string,
  ) {
    const existe = await delegate.findFirst({
      where: { inquilinoId, ...filtro },
      select: { id: true },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe una ${entidad} con código ${filtro.codigo}`,
      );
    }
  }
}
