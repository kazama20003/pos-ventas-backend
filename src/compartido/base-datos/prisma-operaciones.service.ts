import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../../generado/operaciones/client';
import { AppConfigService } from '../configuracion/configuracion-aplicacion.service';

@Injectable()
export class CorePrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.coreDatabaseUrl,
        max: config.databasePoolMax,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      }),
    });
  }

  /**
   * Runs `fn` inside a transaction whose local `app.inquilino_id` GUC is set to
   * the given tenant. Row Level Security policies read that GUC, so every query
   * in the callback is transparently confined to the tenant. Use this for all
   * tenant-scoped work. The setting is transaction-local and never leaks to
   * other pooled connections.
   */
  ejecutarEnTenant<T>(
    inquilinoId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.inquilino_id', ${inquilinoId}, true)`;
      return fn(tx);
    });
  }

  onModuleDestroy(): Promise<void> {
    return this.$disconnect();
  }
}
