import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AppConfigService,
  DuracionJwt,
} from '../../../compartido/configuracion/configuracion-aplicacion.service';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import {
  PayloadJwt,
  TokensEmitidos,
  UsuarioAutenticado,
} from './autenticacion.tipos';
import { IdentidadGoogle, VerificadorGoogle } from './verificador-google';

const REFRESH_EXPIRES_IN: DuracionJwt = '7d';

/** Prefix used for an invited-but-not-yet-signed-in identity. */
export const PREFIJO_INVITACION = 'invitacion:';
/** Prefix used once a Google account has been bound to an identity. */
export const PREFIJO_GOOGLE = 'google:';

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly google: VerificadorGoogle,
  ) {}

  /**
   * Passwordless login. Verifies the Google ID token, resolves the target
   * tenant (explicit code, or auto-detected from the email), then binds the
   * account to its pre-provisioned (invited) identity. Invitation-only: no
   * invitation for that email => no entry.
   */
  async loginGoogle(
    idToken: string,
    tenantCodigo?: string,
  ): Promise<TokensEmitidos> {
    const identidadGoogle = await this.google.verificar(idToken);
    if (!identidadGoogle.emailVerificado) {
      throw new UnauthorizedException('El correo de Google no está verificado');
    }

    const inquilinoId = tenantCodigo
      ? await this.resolverTenantPorCodigo(tenantCodigo)
      : await this.resolverTenantPorEmail(identidadGoogle.email);

    return this.vincularYEmitir(inquilinoId, identidadGoogle);
  }

  private async resolverTenantPorCodigo(codigo: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { codigo },
      select: { id: true, estado: true },
    });
    if (!tenant || tenant.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Acceso no autorizado');
    }
    return tenant.id;
  }

  /**
   * Auto-detects the tenant from the email via the SECURITY DEFINER routing
   * function (the only sanctioned cross-tenant read). One match => use it; many
   * => ask the client to disambiguate with a tenantCodigo; none => signal that
   * the account has no workspace yet so the client can offer onboarding.
   */
  private async resolverTenantPorEmail(email: string): Promise<string> {
    const filas = await this.prisma.$queryRaw<
      { inquilino_id: string }[]
    >`SELECT inquilino_id FROM resolver_login_por_email(${email})`;

    if (filas.length === 0) {
      // Google token is valid but the email belongs to no tenant. This is not a
      // rejection: the user can self-onboard (create their own workspace).
      throw new HttpException(
        {
          codigo: 'SIN_TENANT',
          mensaje:
            'La cuenta no pertenece a ninguna empresa. Crea una nueva para continuar.',
        },
        HttpStatus.CONFLICT,
      );
    }
    if (filas.length === 1) {
      return filas[0].inquilino_id;
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: filas.map((f) => f.inquilino_id) }, estado: 'ACTIVO' },
      select: { codigo: true, nombre: true },
    });
    throw new HttpException(
      {
        codigo: 'SELECCION_TENANT_REQUERIDA',
        mensaje:
          'El correo pertenece a varias empresas. Reintenta enviando tenantCodigo.',
        tenants,
      },
      HttpStatus.CONFLICT,
    );
  }

  private async vincularYEmitir(
    inquilinoId: string,
    identidadGoogle: IdentidadGoogle,
  ): Promise<TokensEmitidos> {
    const sujetoGoogle = `${PREFIJO_GOOGLE}${identidadGoogle.sub}`;

    const identidad = await this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.userIdentity.findUnique({
        where: {
          inquilinoId_email: { inquilinoId, email: identidadGoogle.email },
        },
        select: { id: true, email: true, estado: true, sujetoExterno: true },
      });

      // Invitation-only: the identity must have been provisioned by an admin.
      if (!existente || existente.estado !== 'ACTIVO') {
        return null;
      }

      const membresia = await tx.membership.findFirst({
        where: { inquilinoId, identidadUsuarioId: existente.id },
        select: { id: true, estado: true },
      });
      if (!membresia) {
        return null;
      }

      // First Google sign-in: bind the subject and activate the membership.
      if (existente.sujetoExterno.startsWith(PREFIJO_INVITACION)) {
        await tx.userIdentity.update({
          where: { id: existente.id },
          data: { sujetoExterno: sujetoGoogle, ultimoIngresoEn: new Date() },
        });
        if (membresia.estado === 'INVITADA') {
          await tx.membership.update({
            where: { id: membresia.id },
            data: { estado: 'ACTIVA' },
          });
        }
      } else if (existente.sujetoExterno !== sujetoGoogle) {
        // Email already bound to a different Google account: reject.
        return null;
      } else {
        await tx.userIdentity.update({
          where: { id: existente.id },
          data: { ultimoIngresoEn: new Date() },
        });
      }

      return { id: existente.id, email: existente.email };
    });

    if (!identidad) {
      throw new UnauthorizedException('Acceso no autorizado');
    }

    return this.emitirTokens({
      identidadUsuarioId: identidad.id,
      inquilinoId,
      email: identidad.email,
    });
  }

  async refrescar(refreshToken: string): Promise<TokensEmitidos> {
    let payload: PayloadJwt;
    try {
      payload = await this.jwt.verifyAsync<PayloadJwt>(refreshToken, {
        secret: this.config.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (payload.tipo !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const identidad = await this.prisma.ejecutarEnTenant(
      payload.inquilinoId,
      (tx) =>
        tx.userIdentity.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, estado: true, inquilinoId: true },
        }),
    );
    if (!identidad || identidad.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    return this.emitirTokens({
      identidadUsuarioId: identidad.id,
      inquilinoId: identidad.inquilinoId,
      email: identidad.email,
    });
  }

  /** Issues tokens for an already-resolved identity (used by onboarding). */
  emitirTokensParaUsuario(usuario: UsuarioAutenticado): Promise<TokensEmitidos> {
    return this.emitirTokens(usuario);
  }

  private async emitirTokens(
    usuario: UsuarioAutenticado,
  ): Promise<TokensEmitidos> {
    const base = {
      sub: usuario.identidadUsuarioId,
      inquilinoId: usuario.inquilinoId,
      email: usuario.email,
    };

    const accessToken = await this.jwt.signAsync(
      { ...base, tipo: 'access' } satisfies PayloadJwt,
      { secret: this.config.jwtSecret, expiresIn: this.config.jwtExpiresIn },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...base, tipo: 'refresh' } satisfies PayloadJwt,
      { secret: this.config.jwtSecret, expiresIn: REFRESH_EXPIRES_IN },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.jwtExpiresIn,
    };
  }
}
