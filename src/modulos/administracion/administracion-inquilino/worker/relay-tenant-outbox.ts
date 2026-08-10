import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Pool } from 'pg';
import {
  ConsumirTenantCreadoDto,
  TenantCreadoCarga,
} from '../dto/consumir-tenant-creado.dto';
import { TenantAdministrationService } from '../administracion-inquilino.service';

type EventoOutbox = {
  id: string;
  inquilinoId: string;
  eventType: string;
  idempotencyKey: string;
  carga: TenantCreadoCarga;
  intentos: number;
};

/**
 * Relays Core tenant events into the Management inbox. The worker uses a
 * dedicated Core role because it must claim events from every tenant; request
 * handling continues to use the RLS-constrained CorePrismaService role.
 */
@Injectable()
export class RelayTenantOutbox
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RelayTenantOutbox.name);
  private readonly connectionString = process.env.CORE_OUTBOX_DATABASE_URL;
  private readonly habilitado =
    process.env.TENANT_OUTBOX_RELAY_ENABLED !== 'false' &&
    Boolean(this.connectionString);
  private readonly intervaloMs = Number(
    process.env.TENANT_OUTBOX_RELAY_INTERVAL_MS ?? 5000,
  );
  private readonly lote = 10;
  private readonly pool = this.connectionString
    ? new Pool({ connectionString: this.connectionString, max: 2 })
    : null;
  private temporizador: NodeJS.Timeout | null = null;
  private corriendo = false;

  constructor(private readonly administracion: TenantAdministrationService) {}

  onApplicationBootstrap(): void {
    if (!this.habilitado || !this.pool) {
      this.logger.warn(
        'Relay de tenants deshabilitado (falta CORE_OUTBOX_DATABASE_URL o TENANT_OUTBOX_RELAY_ENABLED=false)',
      );
      return;
    }
    void this.tick();
    this.temporizador = setInterval(() => void this.tick(), this.intervaloMs);
    this.logger.log(`Relay de tenants activo (cada ${this.intervaloMs}ms)`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.temporizador) clearInterval(this.temporizador);
    await this.pool?.end();
  }

  private async tick(): Promise<void> {
    if (this.corriendo || !this.pool) return;
    this.corriendo = true;
    try {
      for (const evento of await this.reclamar()) {
        await this.procesar(evento);
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en relay de tenants: ${mensaje}`);
    } finally {
      this.corriendo = false;
    }
  }

  private async reclamar(): Promise<EventoOutbox[]> {
    if (!this.pool) return [];
    const lockId = `tenant-relay-${process.pid}`;
    const resultado = await this.pool.query<EventoOutbox>(
      `UPDATE "OutboxEvent"
       SET "bloqueadoEn" = now(), "lockedBy" = $1, "intentos" = "intentos" + 1
       WHERE "id" IN (
         SELECT "id" FROM "OutboxEvent"
         WHERE "publicadoEn" IS NULL
           AND "eventType" = 'tenant.created'
           AND "disponibleEn" <= now()
           AND ("bloqueadoEn" IS NULL OR "bloqueadoEn" < now() - interval '2 minutes')
         ORDER BY "disponibleEn" ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING "id", "inquilinoId", "eventType", "idempotencyKey", "carga", "intentos"`,
      [lockId, this.lote],
    );
    return resultado.rows;
  }

  private async procesar(evento: EventoOutbox): Promise<void> {
    try {
      await this.administracion.procesarTenantCreado({
        id: evento.id,
        inquilinoId: evento.inquilinoId,
        eventType: evento.eventType,
        idempotencyKey: evento.idempotencyKey,
        carga: evento.carga,
      } satisfies ConsumirTenantCreadoDto);
      await this.marcarPublicado(evento.id);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      await this.reprogramar(evento.id, evento.intentos, mensaje);
    }
  }

  private async marcarPublicado(id: string): Promise<void> {
    await this.pool?.query(
      `UPDATE "OutboxEvent"
       SET "publicadoEn" = now(), "bloqueadoEn" = NULL, "ultimoError" = NULL
       WHERE "id" = $1::uuid`,
      [id],
    );
  }

  private async reprogramar(
    id: string,
    intentos: number,
    error: string,
  ): Promise<void> {
    const minutos = Math.min(2 ** intentos, 60);
    await this.pool?.query(
      `UPDATE "OutboxEvent"
       SET "bloqueadoEn" = NULL,
           "disponibleEn" = now() + ($2 * interval '1 minute'),
           "ultimoError" = $3
       WHERE "id" = $1::uuid`,
      [id, minutos, error],
    );
  }
}
