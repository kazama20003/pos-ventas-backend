import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generado/administracion/client';
import { Prisma } from '../../../generado/administracion/client';
import { AppConfigService } from '../configuracion/configuracion-aplicacion.service';

@Injectable()
export class ManagementPrismaService
  extends PrismaClient
  implements OnModuleDestroy
{
  constructor(config: AppConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.managementDatabaseUrl,
        max: config.databasePoolMax,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      }),
    });
  }

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
