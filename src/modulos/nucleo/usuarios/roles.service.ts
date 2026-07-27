import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CLAVES_PERMISOS_VALIDAS } from '../identidad/catalogo-permisos';
import { AsignarPermisosDto, CrearRolDto } from './dto/roles.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  private validarClaves(claves: string[]): void {
    const invalidas = claves.filter((c) => !CLAVES_PERMISOS_VALIDAS.has(c));
    if (invalidas.length) {
      throw new BadRequestException(
        `Permisos desconocidos: ${invalidas.join(', ')}`,
      );
    }
  }

  async crear(dto: CrearRolDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const permisos = dto.permisos ?? [];
    this.validarClaves(permisos);

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const rol = await tx.role
        .create({
          data: {
            inquilinoId,
            codigo: dto.codigo,
            nombre: dto.nombre,
            descripcion: dto.descripcion ?? null,
          },
          select: { id: true, codigo: true, nombre: true },
        })
        .catch((e: unknown) => {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          ) {
            throw new BadRequestException(
              `Ya existe un rol con código ${dto.codigo}`,
            );
          }
          throw e;
        });

      await this.reemplazarPermisos(tx, inquilinoId, rol.id, permisos);
      return { ...rol, permisos };
    });
  }

  async listar() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const roles = await tx.role.findMany({
        where: { inquilinoId },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          estado: true,
          permissions: { select: { permission: { select: { clave: true } } } },
        },
        orderBy: { codigo: 'asc' },
      });
      return roles.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        estado: r.estado,
        permisos: r.permissions.map((p) => p.permission.clave),
      }));
    });
  }

  async asignarPermisos(rolId: string, dto: AsignarPermisosDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    this.validarClaves(dto.permisos);

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const rol = await tx.role.findFirst({
        where: { id: rolId, inquilinoId },
        select: { id: true },
      });
      if (!rol) {
        throw new NotFoundException('Rol no encontrado');
      }
      await this.reemplazarPermisos(tx, inquilinoId, rolId, dto.permisos);
      return { id: rolId, permisos: dto.permisos };
    });
  }

  /** Replaces the role's permission set with exactly `claves`. */
  private async reemplazarPermisos(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    rolId: string,
    claves: string[],
  ): Promise<void> {
    await tx.rolePermission.deleteMany({ where: { inquilinoId, rolId } });
    if (!claves.length) {
      return;
    }
    const permisos = await tx.permission.findMany({
      where: { clave: { in: claves } },
      select: { id: true },
    });
    await tx.rolePermission.createMany({
      data: permisos.map((p) => ({
        inquilinoId,
        rolId,
        permisoId: p.id,
        effect: 'PERMITIR' as const,
      })),
    });
  }
}
