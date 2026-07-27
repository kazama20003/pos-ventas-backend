import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../compartido/configuracion/configuracion-aplicacion.service';
import { PayloadJwt, UsuarioAutenticado } from './autenticacion.tipos';

@Injectable()
export class EstrategiaJwt extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  validate(payload: PayloadJwt): UsuarioAutenticado {
    if (payload.tipo !== 'access') {
      throw new UnauthorizedException('Se requiere un access token');
    }
    return {
      identidadUsuarioId: payload.sub,
      inquilinoId: payload.inquilinoId,
      email: payload.email,
    };
  }
}
