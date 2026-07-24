import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generado/operaciones/client';
import { AppConfigService } from '../configuracion/configuracion-aplicacion.service';

@Injectable()
export class CorePrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: config.coreDatabaseUrl }),
    });
  }

  onModuleDestroy(): Promise<void> {
    return this.$disconnect();
  }
}
