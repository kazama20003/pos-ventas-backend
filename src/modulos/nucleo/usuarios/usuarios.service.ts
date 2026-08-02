import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { AppConfigService } from '../../../compartido/configuracion/configuracion-aplicacion.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CorreoService } from '../../../compartido/correo/correo.service';
import { CLAVES_PERMISOS_VALIDAS } from '../identidad/catalogo-permisos';
import { GatingService } from '../../administracion/suscripciones/gating.service';
import { PREFIJO_INVITACION } from '../identidad/autenticacion.service';
import {
  ActualizarUsuarioDto,
  CambiarEstadoUsuarioDto,
  CrearUsuarioDto,
} from './dto/usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly gating: GatingService,
    private readonly correo: CorreoService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Invites a user: provisions the identity (bound to Google on first sign-in)
   * plus an INVITADA membership with the given roles. Access is granted the
   * moment they sign in with the invited Google email.
   */
  async crear(dto: CrearUsuarioDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const email = dto.email.toLowerCase();

    // Gating por plan: si está activo, no permite exceder el máximo de usuarios
    // del plan contratado. Cuenta las membresías no revocadas como uso actual.
    const usuariosActivos = await this.prisma.ejecutarEnTenant(
      inquilinoId,
      (tx) =>
        tx.membership.count({
          where: { inquilinoId, estado: { not: 'REVOCADA' } },
        }),
    );
    await this.gating.exigir('usuarios_max', usuariosActivos);

    const resultado = await this.prisma.ejecutarEnTenant(
      inquilinoId,
      async (tx) => {
        const organizacion = await tx.organization.findFirst({
          where: { id: dto.organizacionId, inquilinoId },
          select: { id: true, nombre: true },
        });
        if (!organizacion) {
          throw new BadRequestException('Organización no encontrada');
        }

        const asignaciones = this.normalizarRoles(dto);
        await this.validarAsignaciones(tx, inquilinoId, asignaciones);

        const identidad = await tx.userIdentity
          .create({
            data: {
              inquilinoId,
              sujetoExterno: `${PREFIJO_INVITACION}${email}`,
              email,
              nombreVisible: dto.nombreVisible,
              estado: 'ACTIVO',
            },
            select: { id: true, email: true },
          })
          .catch((e: unknown) => {
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              e.code === 'P2002'
            ) {
              throw new BadRequestException(
                `Ya existe un usuario con el correo ${email}`,
              );
            }
            throw e;
          });

        const membresia = await tx.membership.create({
          data: {
            inquilinoId,
            organizacionId: dto.organizacionId,
            identidadUsuarioId: identidad.id,
            estado: 'INVITADA',
          },
          select: { id: true },
        });

        await tx.membershipRole.createMany({
          data: asignaciones.map((a) => ({
            inquilinoId,
            membresiaId: membresia.id,
            rolId: a.rolId,
            sucursalId: a.sucursalId ?? null,
          })),
        });

        return {
          identidadUsuarioId: identidad.id,
          membresiaId: membresia.id,
          email: identidad.email,
          estado: 'INVITADA' as const,
          roles: asignaciones,
          negocio: organizacion.nombre,
        };
      },
    );

    // Correo de bienvenida (best-effort, fuera de la transacción: un fallo del
    // proveedor no debe abortar la invitación ya persistida).
    await this.correo.enviarInvitacion({
      para: resultado.email,
      nombre: dto.nombreVisible,
      negocio: resultado.negocio,
      urlLogin: `${this.config.appUrl}/login`,
    });

    return {
      identidadUsuarioId: resultado.identidadUsuarioId,
      membresiaId: resultado.membresiaId,
      email: resultado.email,
      estado: resultado.estado,
      roles: resultado.roles,
    };
  }

  /**
   * Claves de permiso efectivas del usuario logueado (para gating de UI). El
   * backend igual protege cada endpoint; esto solo sirve para ocultar botones.
   * Mismo modelo que GuardPermisos: rol de sistema => todo; si no, unión de
   * PERMITIR (roles + políticas) menos DENEGAR.
   */
  async misPermisos(): Promise<{ esAdmin: boolean; permisos: string[] }> {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const memberships = await tx.membership.findMany({
        where: { inquilinoId, identidadUsuarioId, estado: 'ACTIVA' },
        select: {
          id: true,
          roles: {
            select: { rolId: true, role: { select: { isSystem: true } } },
          },
        },
      });
      if (memberships.length === 0) {
        return { esAdmin: false, permisos: [] };
      }

      const esAdmin = memberships.some((m) =>
        m.roles.some((r) => r.role?.isSystem),
      );
      if (esAdmin) {
        return { esAdmin: true, permisos: [...CLAVES_PERMISOS_VALIDAS] };
      }

      const membresiaIds = memberships.map((m) => m.id);
      const rolIds = [
        ...new Set(memberships.flatMap((m) => m.roles.map((r) => r.rolId))),
      ];

      const permisosRol = rolIds.length
        ? await tx.rolePermission.findMany({
            where: { inquilinoId, rolId: { in: rolIds } },
            select: { effect: true, permission: { select: { clave: true } } },
          })
        : [];
      const politicas = await tx.accessPolicy.findMany({
        where: { inquilinoId, membresiaId: { in: membresiaIds } },
        select: { effect: true, permissionKey: true },
      });

      const permitir = new Set<string>();
      const denegar = new Set<string>();
      for (const p of permisosRol) {
        (p.effect === 'DENEGAR' ? denegar : permitir).add(p.permission.clave);
      }
      for (const p of politicas) {
        (p.effect === 'DENEGAR' ? denegar : permitir).add(p.permissionKey);
      }
      const permisos = [...permitir].filter((c) => !denegar.has(c));
      return { esAdmin: false, permisos };
    });
  }

  /**
   * Reenvía el correo de invitación a un usuario que sigue en estado INVITADA
   * (por si el primer envío no llegó). No cambia nada en la BD.
   */
  async reenviarInvitacion(membresiaId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const datos = await this.prisma.ejecutarEnTenant(
      inquilinoId,
      async (tx) => {
        const m = await tx.membership.findFirst({
          where: { id: membresiaId, inquilinoId },
          select: {
            estado: true,
            userIdentity: { select: { email: true, nombreVisible: true } },
            organization: { select: { nombre: true } },
          },
        });
        if (!m) {
          throw new NotFoundException('Usuario no encontrado');
        }
        if (m.estado !== 'INVITADA') {
          throw new BadRequestException(
            'Solo se puede reenviar la invitación a usuarios pendientes (INVITADA).',
          );
        }
        return m;
      },
    );

    const resultado = await this.correo.enviarInvitacion({
      para: datos.userIdentity.email,
      nombre: datos.userIdentity.nombreVisible,
      negocio: datos.organization.nombre,
      urlLogin: `${this.config.appUrl}/login`,
    });
    return {
      enviado: resultado.ok,
      correo: datos.userIdentity.email,
      error: resultado.error ?? null,
    };
  }

  async listar() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const memberships = await tx.membership.findMany({
        where: { inquilinoId },
        select: {
          id: true,
          estado: true,
          userIdentity: {
            select: {
              id: true,
              email: true,
              nombreVisible: true,
              sujetoExterno: true,
            },
          },
          roles: {
            select: {
              rolId: true,
              sucursalId: true,
              role: { select: { id: true, codigo: true, nombre: true } },
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
      });
      return memberships.map((m) => ({
        membresiaId: m.id,
        estado: m.estado,
        identidadUsuarioId: m.userIdentity.id,
        email: m.userIdentity.email,
        nombreVisible: m.userIdentity.nombreVisible,
        vinculadoAGoogle:
          !m.userIdentity.sujetoExterno.startsWith(PREFIJO_INVITACION),
        roles: m.roles.map((r) => ({
          id: r.role.id,
          codigo: r.role.codigo,
          nombre: r.role.nombre,
          sucursalId: r.sucursalId,
        })),
      }));
    });
  }

  async actualizar(membresiaId: string, dto: ActualizarUsuarioDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const membresia = await tx.membership.findFirst({
        where: { id: membresiaId, inquilinoId },
        select: { id: true, identidadUsuarioId: true },
      });
      if (!membresia) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (dto.nombreVisible !== undefined) {
        await tx.userIdentity.update({
          where: { id: membresia.identidadUsuarioId },
          data: { nombreVisible: dto.nombreVisible },
        });
      }

      if (dto.roles || dto.rolIds) {
        const asignaciones = this.normalizarRoles(dto);
        await this.validarAsignaciones(tx, inquilinoId, asignaciones);
        await tx.membershipRole.deleteMany({
          where: { inquilinoId, membresiaId },
        });
        await tx.membershipRole.createMany({
          data: asignaciones.map((a) => ({
            inquilinoId,
            membresiaId,
            rolId: a.rolId,
            sucursalId: a.sucursalId ?? null,
          })),
        });
      }

      return { membresiaId, actualizado: true };
    });
  }

  async cambiarEstado(membresiaId: string, dto: CambiarEstadoUsuarioDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const membresia = await tx.membership.findFirst({
        where: { id: membresiaId, inquilinoId },
        select: { id: true },
      });
      if (!membresia) {
        throw new NotFoundException('Usuario no encontrado');
      }
      await tx.membership.update({
        where: { id: membresiaId },
        data: { estado: dto.estado },
      });
      return { membresiaId, estado: dto.estado };
    });
  }

  /**
   * Sucursales donde el usuario actual puede operar. Si tiene un rol de sistema
   * (ADMIN) o algún rol global (sin sucursal), devuelve todas las activas;
   * de lo contrario, solo las sucursales de sus roles.
   */
  async misSucursales() {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const memberships = await tx.membership.findMany({
        where: { inquilinoId, identidadUsuarioId, estado: 'ACTIVA' },
        select: {
          roles: {
            select: {
              sucursalId: true,
              role: { select: { isSystem: true } },
            },
          },
        },
      });
      const flat = memberships.flatMap((m) => m.roles);
      const esGlobal = flat.some((r) => r.role?.isSystem || !r.sucursalId);

      const sucursales = await tx.branch.findMany({
        where: {
          inquilinoId,
          estado: 'ACTIVO',
          ...(esGlobal
            ? {}
            : {
                id: {
                  in: [
                    ...new Set(
                      flat
                        .map((r) => r.sucursalId)
                        .filter((s): s is string => !!s),
                    ),
                  ],
                },
              }),
        },
        select: { id: true, codigo: true, nombre: true },
        orderBy: { codigo: 'asc' },
      });
      return { global: esGlobal, sucursales };
    });
  }

  /** Organizaciones activas del tenant (para invitar usuarios). */
  async listarOrganizaciones() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.organization.findMany({
        where: { inquilinoId, estado: 'ACTIVO' },
        select: { id: true, codigo: true, nombre: true },
        orderBy: { codigo: 'asc' },
      }),
    );
  }

  /** Normaliza `roles` (con sucursal) o `rolIds` (global) a una sola forma. */
  private normalizarRoles(dto: {
    roles?: { rolId: string; sucursalId?: string }[];
    rolIds?: string[];
  }): { rolId: string; sucursalId?: string }[] {
    if (dto.roles && dto.roles.length) return dto.roles;
    return (dto.rolIds ?? []).map((rolId) => ({ rolId }));
  }

  private async validarAsignaciones(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    asignaciones: { rolId: string; sucursalId?: string }[],
  ): Promise<void> {
    if (!asignaciones.length) return;

    const rolIds = [...new Set(asignaciones.map((a) => a.rolId))];
    const roles = await tx.role.findMany({
      where: { id: { in: rolIds }, inquilinoId },
      select: { id: true },
    });
    if (roles.length !== rolIds.length) {
      throw new BadRequestException(
        'Uno o más roles no existen en este tenant',
      );
    }

    const sucursalIds = [
      ...new Set(
        asignaciones.map((a) => a.sucursalId).filter((s): s is string => !!s),
      ),
    ];
    if (sucursalIds.length) {
      const sucursales = await tx.branch.findMany({
        where: { id: { in: sucursalIds }, inquilinoId },
        select: { id: true },
      });
      if (sucursales.length !== sucursalIds.length) {
        throw new BadRequestException(
          'Una o más sucursales asignadas no existen en este tenant',
        );
      }
    }
  }
}
