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
 *
 * A system role (isSystem, e.g. the tenant ADMIN created at onboarding) has full
 * access: it bypasses the per-permission check. Granular permissions still apply
 * to invited employees with non-system roles.
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

    const resultado = await this.prisma.ejecutarEnTenant(
      usuario.inquilinoId,
      async (tx) => {
        const memberships = await tx.membership.findMany({
          where: {
            inquilinoId: usuario.inquilinoId,
            identidadUsuarioId: usuario.identidadUsuarioId,
            estado: 'ACTIVA',
          },
          select: {
            id: true,
            roles: {
              select: { rolId: true, role: { select: { isSystem: true } } },
            },
          },
        });

        if (memberships.length === 0) {
          throw new ForbiddenException('Sin membresía activa');
        }

        // Rol de sistema (ADMIN del tenant) => acceso total.
        const esAdmin = memberships.some((m) =>
          m.roles.some((r) => r.role?.isSystem),
        );
        if (esAdmin) {
          return { esAdmin: true, efectos: [] as string[] };
        }

        const membresiaIds = memberships.map((m) => m.id);
        const rolIds = [
          ...new Set(memberships.flatMap((m) => m.roles.map((r) => r.rolId))),
        ];

        // Secuencial: comparten una sola conexión pg dentro de la transacción.
        const permisosRol = rolIds.length
          ? await tx.rolePermission.findMany({
              where: {
                inquilinoId: usuario.inquilinoId,
                rolId: { in: rolIds },
                permission: { clave: permisoRequerido },
              },
              select: { effect: true },
            })
          : [];
        const politicas = await tx.accessPolicy.findMany({
          where: {
            inquilinoId: usuario.inquilinoId,
            membresiaId: { in: membresiaIds },
            permissionKey: permisoRequerido,
          },
          select: { effect: true },
        });

        return {
          esAdmin: false,
          efectos: [...permisosRol, ...politicas].map((e) => e.effect),
        };
      },
    );

    if (resultado.esAdmin) {
      return true;
    }
    if (resultado.efectos.includes('DENEGAR')) {
      throw new ForbiddenException(`Permiso denegado: ${permisoRequerido}`);
    }
    if (resultado.efectos.includes('PERMITIR')) {
      return true;
    }

    throw new ForbiddenException(`Permiso requerido: ${permisoRequerido}`);
  }
}
