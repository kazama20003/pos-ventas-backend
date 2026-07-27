import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UsuarioAutenticado } from './autenticacion.tipos';

/** Marks a route as public: the global JWT guard will skip it. */
export const ES_PUBLICO_KEY = 'esPublico';
export const Publico = () => SetMetadata(ES_PUBLICO_KEY, true);

/** Requires a permission key ("resource.action") checked by GuardPermisos. */
export const PERMISO_KEY = 'permisoRequerido';
export const RequierePermiso = (clave: string) =>
  SetMetadata(PERMISO_KEY, clave);

/** Injects the authenticated user resolved by the JWT strategy. */
export const Usuario = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: UsuarioAutenticado }>();
    return request.user;
  },
);
