import { Module } from '@nestjs/common';
import { TenantAdministrationController } from './administracion-inquilino.controller';
import { TenantAdministrationService } from './administracion-inquilino.service';

@Module({
  controllers: [TenantAdministrationController],
  providers: [TenantAdministrationService],
})
export class TenantAdministrationModule {}
