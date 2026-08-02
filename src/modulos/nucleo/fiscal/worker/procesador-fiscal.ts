import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CorePrismaService } from '../../../../compartido/base-datos/prisma-operaciones.service';
import { FiscalService } from '../fiscal.service';

interface TrabajoOutbox {
  id: string;
  inquilinoId: string;
  aggregateId: string;
  carga: { documentoId?: string } | null;
  intentos: number;
}

const MAX_INTENTOS = 5;

/**
 * Background worker that drains the outbox for `fiscal.*` events and pushes each
 * electronic document to the OSE/PSE via FiscalService. Uses a claim-with-lock
 * (FOR UPDATE SKIP LOCKED) so multiple instances never process the same row.
 *
 * NOTE (RLS): the claim query runs WITHOUT a tenant context because the worker
 * must see rows across all tenants. This requires the runtime DB role to be
 * exempt from Row Level Security on OutboxEvent (owner, superuser, or a BYPASSRLS
 * worker role). Per-document writes downstream ARE tenant-scoped via
 * FiscalService.procesarPendiente(inquilinoId). See memoria rls-activacion-pos-app.
 */
@Injectable()
export class ProcesadorFiscal
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ProcesadorFiscal.name);
  private readonly habilitado = process.env.FISCAL_WORKER_ENABLED !== 'false';
  private readonly intervaloMs = Number(
    process.env.FISCAL_WORKER_INTERVAL_MS ?? 5000,
  );
  private readonly lote = 10;
  private temporizador: NodeJS.Timeout | null = null;
  private corriendo = false;

  constructor(
    private readonly prisma: CorePrismaService,
    private readonly fiscal: FiscalService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.habilitado) {
      this.logger.warn(
        'Worker fiscal deshabilitado (FISCAL_WORKER_ENABLED=false)',
      );
      return;
    }
    this.temporizador = setInterval(() => {
      void this.tick();
    }, this.intervaloMs);
    this.logger.log(`Worker fiscal activo (cada ${this.intervaloMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** One drain cycle. Guarded so a slow batch never overlaps the next tick. */
  private async tick(): Promise<void> {
    if (this.corriendo) return;
    this.corriendo = true;
    try {
      const trabajos = await this.reclamar();
      for (const trabajo of trabajos) {
        await this.procesar(trabajo);
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en ciclo del worker fiscal: ${mensaje}`);
    } finally {
      this.corriendo = false;
    }
  }

  private reclamar(): Promise<TrabajoOutbox[]> {
    const lockId = `fiscal-${process.pid}`;
    return this.prisma.$queryRaw<TrabajoOutbox[]>`
      UPDATE "OutboxEvent" SET "bloqueadoEn" = now(), "lockedBy" = ${lockId},
        "intentos" = "intentos" + 1
      WHERE "id" IN (
        SELECT "id" FROM "OutboxEvent"
        WHERE "publicadoEn" IS NULL
          AND "eventType" = 'fiscal.comprobante.emitir'
          AND "disponibleEn" <= now()
          AND ("bloqueadoEn" IS NULL OR "bloqueadoEn" < now() - interval '2 minutes')
        ORDER BY "disponibleEn" ASC
        LIMIT ${this.lote}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "inquilinoId", "aggregateId", "carga", "intentos"`;
  }

  private async procesar(trabajo: TrabajoOutbox): Promise<void> {
    const documentoId = trabajo.carga?.documentoId ?? trabajo.aggregateId;
    const resultado = await this.fiscal.procesarPendiente(
      documentoId,
      trabajo.inquilinoId,
    );

    if (resultado.procesado) {
      await this.marcarPublicado(trabajo.id);
      return;
    }
    if (trabajo.intentos >= MAX_INTENTOS) {
      this.logger.warn(
        `Documento ${documentoId} agotó reintentos (${trabajo.intentos}); se abandona en el outbox`,
      );
      await this.marcarPublicado(trabajo.id, resultado.motivo);
      return;
    }
    await this.reprogramar(trabajo.id, trabajo.intentos, resultado.motivo);
  }

  private async marcarPublicado(id: string, error?: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "OutboxEvent"
      SET "publicadoEn" = now(), "bloqueadoEn" = NULL, "ultimoError" = ${error ?? null}
      WHERE "id" = ${id}::uuid`;
  }

  /** Exponential backoff: retry after 2^intentos minutes (capped by MAX). */
  private async reprogramar(
    id: string,
    intentos: number,
    error?: string,
  ): Promise<void> {
    const minutos = Math.min(2 ** intentos, 60);
    await this.prisma.$executeRaw`
      UPDATE "OutboxEvent"
      SET "bloqueadoEn" = NULL, "disponibleEn" = now() + (${minutos} * interval '1 minute'),
        "ultimoError" = ${error ?? null}
      WHERE "id" = ${id}::uuid`;
  }
}
