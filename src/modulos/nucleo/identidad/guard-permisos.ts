import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { UsuarioAutenticado } from './autenticacion.tipos';
import { PERMISO_KEY } from './decoradores';

/**
 * Authorization guard. Resolves the required permission key against the user's
 * memberships -> roles -> role permissions plus per-membership AccessPolicy
 * overrides. Deny-by-default: an explicit DENEGAR anywhere wins over PERMITIR.
 */
@Injectable()
export class GuardPermisos implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: CorePrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permisoRequerido = this.reflector.getAllAndOverride<string>(
      PERMISO_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permisoRequerido) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>();
    const usuario = request.user;
    if (!usuario) {
      throw new ForbiddenException('No autenticado');
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        inquilinoId: usuario.inquilinoId,
        identidadUsuarioId: usuario.identidadUsuarioId,
        estado: 'ACTIVA',
      },
      select: { id: true, roles: { select: { rolId: true } } },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('Sin membresía activa');
    }

    const membresiaIds = memberships.map((m) => m.id);
    const rolIds = [
      ...new Set(memberships.flatMap((m) => m.roles.map((r) => r.rolId))),
    ];

    const [permisosRol, politicas] = await Promise.all([
      rolIds.length
        ? this.prisma.rolePermission.findMany({
            where: {
              inquilinoId: usuario.inquilinoId,
              rolId: { in: rolIds },
              permission: { clave: permisoRequerido },
            },
            select: { effect: true },
          })
        : Promise.resolve([]),
      this.prisma.accessPolicy.findMany({
        where: {
          inquilinoId: usuario.inquilinoId,
          membresiaId: { in: membresiaIds },
          permissionKey: permisoRequerido,
        },
        select: { effect: true },
      }),
    ]);

    const efectos = [...permisosRol, ...politicas].map((e) => e.effect);

    if (efectos.includes('DENEGAR')) {
      throw new ForbiddenException(`Permiso denegado: ${permisoRequerido}`);
    }
    if (efectos.includes('PERMITIR')) {
      return true;
    }

    throw new ForbiddenException(`Permiso requerido: ${permisoRequerido}`);
  }
}
