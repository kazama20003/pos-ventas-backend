import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CorePrismaService } from '../../../../compartido/base-datos/prisma-operaciones.service';

/**
 * Purga automática de la bitácora de auditoría: borra los AuditLog más antiguos
 * que la retención configurada, para no saturar la base con historial infinito.
 *
 * Config: AUDIT_RETENTION_DAYS (default 90), AUDIT_PURGE_INTERVAL_HOURS (default
 * 24), AUDIT_PURGE_ENABLED (default true).
 *
 * NOTA (RLS): el DELETE corre sin contexto de tenant (barre todos); requiere rol
 * DB exento de RLS en AuditLog (owner/superusuario/BYPASSRLS). Ver memoria
 * rls-activacion-pos-app.
 */
@Injectable()
export class PurgaAuditoria implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PurgaAuditoria.name);
  private readonly habilitado = process.env.AUDIT_PURGE_ENABLED !== 'false';
  private readonly retencionDias = Number(
    process.env.AUDIT_RETENTION_DAYS ?? 90,
  );
  private readonly intervaloMs =
    Number(process.env.AUDIT_PURGE_INTERVAL_HOURS ?? 24) * 60 * 60 * 1000;
  private temporizador: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: CorePrismaService) {}

  onApplicationBootstrap(): void {
    if (!this.habilitado) {
      this.logger.warn('Purga de auditoría deshabilitada');
      return;
    }
    // Corre una vez al arrancar y luego cada intervalo.
    void this.purgar();
    this.temporizador = setInterval(() => void this.purgar(), this.intervaloMs);
    this.logger.log(
      `Purga de auditoría activa (retención ${this.retencionDias}d, cada ${this.intervaloMs / 3_600_000}h)`,
    );
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private async purgar(): Promise<void> {
    try {
      const borrados = await this.prisma.$executeRaw`
        DELETE FROM "AuditLog"
        WHERE "creadoEn" < now() - (${this.retencionDias} * interval '1 day')`;
      if (borrados > 0) {
        this.logger.log(`Auditoría purgada: ${borrados} registros antiguos`);
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo purgando auditoría: ${mensaje}`);
    }
  }
}
