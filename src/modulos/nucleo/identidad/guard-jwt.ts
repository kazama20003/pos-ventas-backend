import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ES_PUBLICO_KEY } from './decoradores';

/**
 * Global authentication guard. Every route requires a valid access token
 * unless explicitly marked with @Publico().
 */
@Injectable()
export class GuardJwt extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(
      ES_PUBLICO_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (esPublico) {
      return true;
    }
    return super.canActivate(context);
  }
}
