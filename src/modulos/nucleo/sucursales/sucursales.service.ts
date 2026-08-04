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
  ActualizarAlmacenDto,
  ActualizarCajaDto,
  ActualizarSucursalDto,
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
          sunatUbigeo: true,
          address: true,
          phone: true,
          timezone: true,
          _count: { select: { almacenes: true, cajas: true } },
        },
      }),
    );
  }

  async actualizarSucursal(id: string, dto: ActualizarSucursalDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirSucursal(tx, inquilinoId, id);
      return tx.branch.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.sunatUbigeo !== undefined
            ? { sunatUbigeo: dto.sunatUbigeo || null }
            : {}),
          ...(dto.address !== undefined
            ? { address: dto.address || null }
            : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          estado: true,
          sunatUbigeo: true,
          address: true,
          phone: true,
        },
      });
    });
  }

  async cambiarEstadoSucursal(id: string, archivar: boolean) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirSucursal(tx, inquilinoId, id);
      return tx.branch.update({
        where: { id },
        data: { estado: archivar ? 'ARCHIVADO' : 'ACTIVO' },
        select: { id: true, estado: true },
      });
    });
  }

  async crearAlmacen(dto: CrearAlmacenDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirSucursal(tx, inquilinoId, dto.sucursalId);
      // Lock de la sucursal: serializa dos altas concurrentes para que el
      // "primer almacén = predeterminado" no marque dos predeterminados.
      await tx.$queryRaw`
        SELECT "id" FROM "Branch"
        WHERE "id" = ${dto.sucursalId}::uuid AND "inquilinoId" = ${inquilinoId}::uuid
        FOR UPDATE`;
      await this.exigirUnico(
        tx.warehouse,
        inquilinoId,
        { sucursalId: dto.sucursalId, codigo: dto.codigo },
        'almacén',
      );
      // El primer almacén de la sucursal queda como predeterminado.
      const yaHay = await tx.warehouse.count({
        where: { inquilinoId, sucursalId: dto.sucursalId },
      });
      return tx.warehouse.create({
        data: {
          inquilinoId,
          sucursalId: dto.sucursalId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          address: dto.address ?? null,
          tipo: dto.tipo ?? 'PRINCIPAL',
          esPredeterminado: yaHay === 0,
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          tipo: true,
          esPredeterminado: true,
          estado: true,
        },
      });
    });
  }

  listarAlmacenes(sucursalId?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.warehouse.findMany({
        where: { inquilinoId, sucursalId: sucursalId || undefined },
        orderBy: [{ esPredeterminado: 'desc' }, { codigo: 'asc' }],
        select: {
          id: true,
          sucursalId: true,
          codigo: true,
          nombre: true,
          estado: true,
          address: true,
          tipo: true,
          esPredeterminado: true,
        },
      }),
    );
  }

  /**
   * Marca un almacén como predeterminado de su sucursal (destino/origen por
   * defecto de ventas y operaciones). Desmarca al anterior de forma atómica.
   */
  async marcarAlmacenPredeterminado(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const almacen = await tx.warehouse.findFirst({
        where: { id, inquilinoId },
        select: { id: true, sucursalId: true, estado: true },
      });
      if (!almacen) throw new NotFoundException('Almacén no encontrado');
      if (almacen.estado !== 'ACTIVO')
        throw new ConflictException(
          'No se puede predeterminar un almacén archivado',
        );
      // Quitar el flag al actual predeterminado de la sucursal (si otro).
      await tx.warehouse.updateMany({
        where: {
          inquilinoId,
          sucursalId: almacen.sucursalId,
          esPredeterminado: true,
          id: { not: id },
        },
        data: { esPredeterminado: false },
      });
      return tx.warehouse.update({
        where: { id },
        data: { esPredeterminado: true },
        select: { id: true, esPredeterminado: true },
      });
    });
  }

  async actualizarAlmacen(id: string, dto: ActualizarAlmacenDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existe = await tx.warehouse.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!existe) throw new NotFoundException('Almacén no encontrado');
      return tx.warehouse.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.address !== undefined
            ? { address: dto.address || null }
            : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          estado: true,
          address: true,
          tipo: true,
          esPredeterminado: true,
        },
      });
    });
  }

  async cambiarEstadoAlmacen(id: string, archivar: boolean) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existe = await tx.warehouse.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!existe) throw new NotFoundException('Almacén no encontrado');
      return tx.warehouse.update({
        where: { id },
        data: { estado: archivar ? 'ARCHIVADO' : 'ACTIVO' },
        select: { id: true, estado: true },
      });
    });
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
      if (dto.almacenId) {
        await this.exigirAlmacenDeSucursal(
          tx,
          inquilinoId,
          dto.sucursalId,
          dto.almacenId,
        );
      }
      return tx.cashRegister.create({
        data: {
          inquilinoId,
          sucursalId: dto.sucursalId,
          codigo: dto.codigo,
          nombre: dto.nombre,
          almacenId: dto.almacenId ?? null,
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          almacenId: true,
          estado: true,
        },
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
          almacenId: true,
          estado: true,
        },
      }),
    );
  }

  async actualizarCaja(id: string, dto: ActualizarCajaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existe = await tx.cashRegister.findFirst({
        where: { id, inquilinoId },
        select: { id: true, sucursalId: true },
      });
      if (!existe) throw new NotFoundException('Caja no encontrada');
      if (dto.almacenId) {
        await this.exigirAlmacenDeSucursal(
          tx,
          inquilinoId,
          existe.sucursalId,
          dto.almacenId,
        );
      }
      return tx.cashRegister.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          // `null` desvincula; `undefined` deja el almacén como está.
          ...(dto.almacenId !== undefined
            ? { almacenId: dto.almacenId }
            : {}),
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          almacenId: true,
          estado: true,
        },
      });
    });
  }

  async cambiarEstadoCaja(id: string, archivar: boolean) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existe = await tx.cashRegister.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!existe) throw new NotFoundException('Caja no encontrada');
      return tx.cashRegister.update({
        where: { id },
        data: { estado: archivar ? 'ARCHIVADO' : 'ACTIVO' },
        select: { id: true, estado: true },
      });
    });
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

  /** El almacén debe existir, pertenecer a la sucursal y estar activo. */
  private async exigirAlmacenDeSucursal(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    sucursalId: string,
    almacenId: string,
  ) {
    const almacen = await tx.warehouse.findFirst({
      where: { id: almacenId, inquilinoId, sucursalId, estado: 'ACTIVO' },
      select: { id: true },
    });
    if (!almacen)
      throw new ConflictException(
        'El almacén no existe, está archivado o no pertenece a la sucursal',
      );
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
