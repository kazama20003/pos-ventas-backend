import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface ContextoSolicitud {
  inquilinoId: string;
  identidadUsuarioId: string;
  email: string;
  membresiaId?: string;
  sucursalId?: string;
}

/**
 * Propagates the authenticated tenant/user context across the async call
 * chain without threading it through every function. Consumed by the Prisma
 * RLS layer (SET LOCAL app.inquilino_id) and the sales engine.
 */
@Injectable()
export class ContextoSolicitudService {
  private readonly almacen = new AsyncLocalStorage<ContextoSolicitud>();

  ejecutar<T>(contexto: ContextoSolicitud, fn: () => T): T {
    return this.almacen.run(contexto, fn);
  }

  obtener(): ContextoSolicitud | undefined {
    return this.almacen.getStore();
  }

  obtenerObligatorio(): ContextoSolicitud {
    const contexto = this.almacen.getStore();
    if (!contexto) {
      throw new Error(
        'No hay contexto de solicitud activo. ¿Falta autenticación o el interceptor de contexto?',
      );
    }
    return contexto;
  }

  get inquilinoId(): string {
    return this.obtenerObligatorio().inquilinoId;
  }
}
