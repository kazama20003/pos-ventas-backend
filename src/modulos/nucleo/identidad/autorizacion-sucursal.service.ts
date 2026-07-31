import { ForbiddenException, Injectable } from '@nestjs/common';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';

/**
 * Autorización con alcance por sucursal. Complementa al GuardPermisos (que
 * comprueba si el usuario tiene el permiso "en algún lado"): aquí se valida que
 * lo tenga **en la sucursal concreta** de la operación.
 *
 * Reglas:
 *  - Rol de sistema (ADMIN) => acceso total en cualquier sucursal.
 *  - Un rol aplica a la sucursal si su `sucursalId` es null (global) o coincide.
 *  - Deny-by-default; un efecto DENEGAR gana sobre PERMITIR.
 *
 * Lo invocan los servicios que conocen el `sucursalId` de la operación
 * (abrir caja, registrar venta, etc.).
 */
@Injectable()
export class AutorizacionSucursalService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async permitidoEnSucursal(
    permiso: string,
    sucursalId: string,
  ): Promise<boolean> {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const memberships = await tx.membership.findMany({
        where: { inquilinoId, identidadUsuarioId, estado: 'ACTIVA' },
        select: {
          id: true,
          roles: {
            select: {
              rolId: true,
              sucursalId: true,
              role: { select: { isSystem: true } },
            },
          },
        },
      });
      if (memberships.length === 0) return false;

      // ADMIN (rol de sistema) => acceso total.
      if (memberships.some((m) => m.roles.some((r) => r.role?.isSystem))) {
        return true;
      }

      // Roles que aplican a esta sucursal: globales o de la sucursal.
      const rolesAplicables = memberships
        .flatMap((m) => m.roles)
        .filter((r) => !r.sucursalId || r.sucursalId === sucursalId);
      const rolIds = [...new Set(rolesAplicables.map((r) => r.rolId))];

      const membresiaIds = memberships.map((m) => m.id);

      // Secuencial: comparten una sola conexión pg en la transacción.
      const permisosRol = rolIds.length
        ? await tx.rolePermission.findMany({
            where: {
              inquilinoId,
              rolId: { in: rolIds },
              permission: { clave: permiso },
            },
            select: { effect: true },
          })
        : [];
      const politicas = await tx.accessPolicy.findMany({
        where: {
          inquilinoId,
          membresiaId: { in: membresiaIds },
          permissionKey: permiso,
          OR: [{ sucursalId: null }, { sucursalId }],
        },
        select: { effect: true },
      });

      const efectos = [...permisosRol, ...politicas].map((e) => e.effect);
      if (efectos.includes('DENEGAR')) return false;
      return efectos.includes('PERMITIR');
    });
  }

  /** Igual que `permitidoEnSucursal` pero lanza 403 si no está autorizado. */
  async exigirEnSucursal(permiso: string, sucursalId: string): Promise<void> {
    const ok = await this.permitidoEnSucursal(permiso, sucursalId);
    if (!ok) {
      throw new ForbiddenException(
        `No autorizado para "${permiso}" en esta sucursal`,
      );
    }
  }
}
