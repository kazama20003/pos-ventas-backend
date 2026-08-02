import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';

export interface EntradaAuditoria {
  inquilinoId: string;
  actorIdentityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  entityType: string;
  entityId: string;
  action: string;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Escribe la bitácora de cambios (AuditLog). Best-effort: un fallo al auditar
 * nunca debe romper la operación de negocio, por eso `registrar` traga errores.
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: CorePrismaService) {}

  async registrar(entrada: EntradaAuditoria): Promise<void> {
    try {
      await this.prisma.ejecutarEnTenant(entrada.inquilinoId, (tx) =>
        tx.auditLog.create({
          data: {
            inquilinoId: entrada.inquilinoId,
            actorIdentityId: entrada.actorIdentityId,
            ipAddress: entrada.ipAddress,
            userAgent: entrada.userAgent,
            entityType: entrada.entityType,
            entityId: entrada.entityId,
            action: entrada.action,
            after: (entrada.after as Prisma.InputJsonValue) ?? undefined,
            metadata: (entrada.metadata as Prisma.InputJsonValue) ?? undefined,
          },
        }),
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo registrar auditoría: ${mensaje}`);
    }
  }
}
