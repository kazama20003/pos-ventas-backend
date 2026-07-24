import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generado/administracion/client';
import { AppConfigService } from '../configuracion/configuracion-aplicacion.service';

@Injectable()
export class ManagementPrismaService
  extends PrismaClient
  implements OnModuleDestroy
{
  constructor(config: AppConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: config.managementDatabaseUrl }),
    });
  }

  onModuleDestroy(): Promise<void> {
    return this.$disconnect();
  }
}
