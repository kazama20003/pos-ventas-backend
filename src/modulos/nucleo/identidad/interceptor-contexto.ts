import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { UsuarioAutenticado } from './autenticacion.tipos';

/**
 * Runs the request handler inside the tenant/user AsyncLocalStorage store so
 * downstream code (Prisma RLS, sales engine) can read the context without it
 * being threaded through every call. Runs after the JWT guard populates
 * request.user; skips unauthenticated (public) requests.
 */
@Injectable()
export class InterceptorContexto implements NestInterceptor {
  constructor(private readonly contexto: ContextoSolicitudService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>();
    const usuario = request.user;

    if (!usuario) {
      return next.handle();
    }

    return this.contexto.ejecutar(
      {
        inquilinoId: usuario.inquilinoId,
        identidadUsuarioId: usuario.identidadUsuarioId,
        email: usuario.email,
      },
      () => next.handle(),
    );
  }
}
