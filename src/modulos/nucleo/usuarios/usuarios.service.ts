import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
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

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const organizacion = await tx.organization.findFirst({
        where: { id: dto.organizacionId, inquilinoId },
        select: { id: true },
      });
      if (!organizacion) {
        throw new BadRequestException('Organización no encontrada');
      }

      await this.validarRoles(tx, inquilinoId, dto.rolIds);

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
        data: dto.rolIds.map((rolId) => ({
          inquilinoId,
          membresiaId: membresia.id,
          rolId,
        })),
      });

      return {
        identidadUsuarioId: identidad.id,
        membresiaId: membresia.id,
        email: identidad.email,
        estado: 'INVITADA',
        roles: dto.rolIds,
      };
    });
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
          roles: { select: { role: { select: { id: true, codigo: true } } } },
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
        roles: m.roles.map((r) => ({ id: r.role.id, codigo: r.role.codigo })),
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

      if (dto.rolIds) {
        await this.validarRoles(tx, inquilinoId, dto.rolIds);
        await tx.membershipRole.deleteMany({
          where: { inquilinoId, membresiaId },
        });
        await tx.membershipRole.createMany({
          data: dto.rolIds.map((rolId) => ({
            inquilinoId,
            membresiaId,
            rolId,
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

  private async validarRoles(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    rolIds: string[],
  ): Promise<void> {
    if (!rolIds.length) {
      return;
    }
    const encontrados = await tx.role.findMany({
      where: { id: { in: rolIds }, inquilinoId },
      select: { id: true },
    });
    if (encontrados.length !== rolIds.length) {
      throw new BadRequestException(
        'Uno o más roles no existen en este tenant',
      );
    }
  }
}
