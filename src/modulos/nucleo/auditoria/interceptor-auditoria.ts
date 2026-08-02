import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UsuarioAutenticado } from '../identidad/autenticacion.tipos';
import { AuditoriaService } from './auditoria.service';

const METODOS_MUTANTES = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

interface SolicitudHttp {
  method: string;
  originalUrl?: string;
  url: string;
  ip?: string;
  params?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  user?: UsuarioAutenticado;
}

/**
 * Registra en AuditLog cada mutación autenticada (POST/PATCH/PUT/DELETE) tras
 * completarse con éxito. Captura tenant/actor del request de forma síncrona (no
 * depende del AsyncLocalStorage en el callback diferido). No audita lecturas ni
 * peticiones públicas; nunca bloquea la respuesta.
 */
@Injectable()
export class InterceptorAuditoria implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<SolicitudHttp>();
    const usuario = req.user;

    if (!usuario || !METODOS_MUTANTES.has(req.method)) {
      return next.handle();
    }

    const ruta = req.originalUrl ?? req.url;
    const entityType = this.recurso(ruta);
    const userAgent = this.encabezado(req.headers['user-agent']);

    return next.handle().pipe(
      tap((resultado) => {
        void this.auditoria.registrar({
          inquilinoId: usuario.inquilinoId,
          actorIdentityId: usuario.identidadUsuarioId,
          ipAddress: req.ip ?? null,
          userAgent,
          entityType,
          entityId: this.idEntidad(resultado, req.params),
          action: `${req.method} ${ruta.split('?')[0]}`,
          after: this.resumen(resultado),
          metadata: { ruta, method: req.method },
        });
      }),
    );
  }

  /** Primer segmento tras /api/ como tipo de entidad (ventas, clientes, …). */
  private recurso(ruta: string): string {
    const partes = ruta.split('?')[0].split('/').filter(Boolean);
    const idx = partes.indexOf('api');
    return partes[idx + 1] ?? partes[0] ?? 'desconocido';
  }

  private idEntidad(
    resultado: unknown,
    params?: Record<string, string>,
  ): string {
    if (resultado && typeof resultado === 'object' && 'id' in resultado) {
      return String(resultado.id);
    }
    return params?.id ?? params?.membresiaId ?? '-';
  }

  /** Guarda una foto compacta del resultado (evita cargas enormes). */
  private resumen(resultado: unknown): Record<string, unknown> | null {
    if (!resultado || typeof resultado !== 'object') return null;
    const r = resultado as Record<string, unknown>;
    const campos = ['id', 'estado', 'number', 'numero', 'total', 'idempotente'];
    const salida: Record<string, unknown> = {};
    for (const campo of campos) {
      if (campo in r) salida[campo] = r[campo];
    }
    return Object.keys(salida).length ? salida : null;
  }

  private encabezado(valor: string | string[] | undefined): string | null {
    if (Array.isArray(valor)) return valor[0] ?? null;
    return valor ?? null;
  }
}
