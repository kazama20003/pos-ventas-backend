import { Injectable, UnauthorizedException } from '@nestjs/common';
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
import { VerificadorGoogle } from './verificador-google';

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
   * Passwordless login. Verifies the Google ID token, then binds it to a
   * pre-provisioned (invited) identity in the target tenant. Access is
   * invitation-only: no invitation for that email => no entry.
   */
  async loginGoogle(idToken: string, tenantCodigo: string): Promise<TokensEmitidos> {
    const identidadGoogle = await this.google.verificar(idToken);
    if (!identidadGoogle.emailVerificado) {
      throw new UnauthorizedException('El correo de Google no está verificado');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { codigo: tenantCodigo },
      select: { id: true, estado: true },
    });
    if (!tenant || tenant.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Acceso no autorizado');
    }

    const sujetoGoogle = `${PREFIJO_GOOGLE}${identidadGoogle.sub}`;

    const identidad = await this.prisma.ejecutarEnTenant(tenant.id, async (tx) => {
      const existente = await tx.userIdentity.findUnique({
        where: {
          inquilinoId_email: { inquilinoId: tenant.id, email: identidadGoogle.email },
        },
        select: { id: true, email: true, estado: true, sujetoExterno: true },
      });

      // Invitation-only: the identity must have been provisioned by an admin.
      if (!existente || existente.estado !== 'ACTIVO') {
        return null;
      }

      const requiereMembresiaActiva = await tx.membership.findFirst({
        where: { inquilinoId: tenant.id, identidadUsuarioId: existente.id },
        select: { id: true, estado: true },
      });
      if (!requiereMembresiaActiva) {
        return null;
      }

      // First Google sign-in: bind the subject and activate the membership.
      if (existente.sujetoExterno.startsWith(PREFIJO_INVITACION)) {
        await tx.userIdentity.update({
          where: { id: existente.id },
          data: { sujetoExterno: sujetoGoogle, ultimoIngresoEn: new Date() },
        });
        if (requiereMembresiaActiva.estado === 'INVITADA') {
          await tx.membership.update({
            where: { id: requiereMembresiaActiva.id },
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
      inquilinoId: tenant.id,
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
