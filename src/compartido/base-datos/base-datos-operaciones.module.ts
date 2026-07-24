import { Global, Module } from '@nestjs/common';
import { CorePrismaService } from './prisma-operaciones.service';

@Global()
@Module({
  providers: [CorePrismaService],
  exports: [CorePrismaService],
})
export class CoreDatabaseModule {}
