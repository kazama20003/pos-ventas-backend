import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { AutenticacionService, PREFIJO_GOOGLE } from '../identidad/autenticacion.service';
import { CATALOGO_PERMISOS } from '../identidad/catalogo-permisos';
import { VerificadorGoogle } from '../identidad/verificador-google';
import { RegistrarEmpresaDto } from './dto/registrar.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly google: VerificadorGoogle,
    private readonly auth: AutenticacionService,
  ) {}

  /**
   * Self-service registration. The person registering signs in with Google and
   * becomes the owner/admin of a brand-new tenant: company, org, an ADMIN role
   * holding every permission, and an ACTIVE membership. Returns tokens so they
   * are logged in immediately. This is the only way an admin is created without
   * a prior invitation (solves the bootstrap problem).
   */
  async registrar(dto: RegistrarEmpresaDto) {
    const identidadGoogle = await this.google.verificar(dto.idToken);
    if (!identidadGoogle.emailVerificado) {
      throw new UnauthorizedException('El correo de Google no está verificado');
    }
    const email = identidadGoogle.email;
    const sujetoExterno = `${PREFIJO_GOOGLE}${identidadGoogle.sub}`;
    const nombreAdmin =
      dto.adminNombre ?? identidadGoogle.nombre ?? email;

    const resultado = await this.prisma.$transaction(async (tx) => {
      // Tenant is not tenant-scoped (no RLS), so it can be created first.
      const tenant = await tx.tenant
        .create({
          data: { codigo: dto.tenantCodigo, nombre: dto.tenantNombre },
          select: { id: true, codigo: true },
        })
        .catch((e: unknown) => {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          ) {
            throw new ConflictException(
              `El código de empresa "${dto.tenantCodigo}" ya está en uso`,
            );
          }
          throw e;
        });

      // From here every insert must carry this tenant; set the RLS GUC so the
      // policies' WITH CHECK passes for the new tenant's rows.
      await tx.$executeRaw`SELECT set_config('app.inquilino_id', ${tenant.id}, true)`;

      const organizacion = await tx.organization.create({
        data: {
          inquilinoId: tenant.id,
          codigo: 'PRINCIPAL',
          nombre: dto.organizacionNombre,
        },
        select: { id: true },
      });

      await tx.company.create({
        data: {
          inquilinoId: tenant.id,
          organizacionId: organizacion.id,
          razonSocial: dto.empresaRazonSocial,
          ruc: dto.empresaRuc,
        },
      });

      const admin = await tx.userIdentity.create({
        data: {
          inquilinoId: tenant.id,
          sujetoExterno,
          email,
          nombreVisible: nombreAdmin,
          estado: 'ACTIVO',
          ultimoIngresoEn: new Date(),
        },
        select: { id: true, email: true },
      });

      const rolAdmin = await tx.role.create({
        data: {
          inquilinoId: tenant.id,
          codigo: 'ADMIN',
          nombre: 'Administrador',
          descripcion: 'Rol con control total del POS',
          isSystem: true,
        },
        select: { id: true },
      });

      const permisos = await tx.permission.findMany({
        where: { clave: { in: CATALOGO_PERMISOS.map((p) => p.clave) } },
        select: { id: true },
      });
      await tx.rolePermission.createMany({
        data: permisos.map((p) => ({
          inquilinoId: tenant.id,
          rolId: rolAdmin.id,
          permisoId: p.id,
          effect: 'PERMITIR' as const,
        })),
      });

      const membresia = await tx.membership.create({
        data: {
          inquilinoId: tenant.id,
          organizacionId: organizacion.id,
          identidadUsuarioId: admin.id,
          estado: 'ACTIVA',
        },
        select: { id: true },
      });
      await tx.membershipRole.create({
        data: {
          inquilinoId: tenant.id,
          membresiaId: membresia.id,
          rolId: rolAdmin.id,
        },
      });

      return {
        tenantId: tenant.id,
        tenantCodigo: tenant.codigo,
        adminId: admin.id,
        email: admin.email,
      };
    });

    const tokens = await this.auth.emitirTokensParaUsuario({
      identidadUsuarioId: resultado.adminId,
      inquilinoId: resultado.tenantId,
      email: resultado.email,
    });

    return {
      tenant: {
        id: resultado.tenantId,
        codigo: resultado.tenantCodigo,
      },
      admin: { id: resultado.adminId, email: resultado.email },
      tokens,
    };
  }
}
