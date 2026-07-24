import { Global, Module } from '@nestjs/common';
import { ManagementPrismaService } from './prisma-administracion.service';

@Global()
@Module({
  providers: [ManagementPrismaService],
  exports: [ManagementPrismaService],
})
export class ManagementDatabaseModule {}
