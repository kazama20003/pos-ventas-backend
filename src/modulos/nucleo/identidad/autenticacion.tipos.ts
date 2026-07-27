export type TipoToken = 'access' | 'refresh';

export interface PayloadJwt {
  /** UserIdentity.id */
  sub: string;
  inquilinoId: string;
  email: string;
  tipo: TipoToken;
}

export interface UsuarioAutenticado {
  identidadUsuarioId: string;
  inquilinoId: string;
  email: string;
}

export interface TokensEmitidos {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}
