import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AppConfigService } from '../../../compartido/configuracion/configuracion-aplicacion.service';

export interface IdentidadGoogle {
  sub: string;
  email: string;
  emailVerificado: boolean;
  nombre?: string;
}

/**
 * Verifies a Google ID token (sent by the client after Google sign-in) against
 * Google's public keys and this app's client id. Isolated behind an injectable
 * so it can be replaced in tests where a real Google token can't be minted.
 */
@Injectable()
export class VerificadorGoogle {
  private readonly cliente: OAuth2Client;

  constructor(private readonly config: AppConfigService) {
    this.cliente = new OAuth2Client(config.googleClientId);
  }

  async verificar(idToken: string): Promise<IdentidadGoogle> {
    let payload;
    try {
      const ticket = await this.cliente.verifyIdToken({
        idToken,
        audience: this.config.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token de Google incompleto');
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerificado: payload.email_verified ?? false,
      nombre: payload.name,
    };
  }
}
