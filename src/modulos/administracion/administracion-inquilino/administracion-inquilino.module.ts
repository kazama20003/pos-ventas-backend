import { Module } from '@nestjs/common';
import { TenantAdministrationController } from './administracion-inquilino.controller';
import { TenantAdministrationService } from './administracion-inquilino.service';
import { RelayTenantOutbox } from './worker/relay-tenant-outbox';

@Module({
  controllers: [TenantAdministrationController],
  providers: [TenantAdministrationService, RelayTenantOutbox],
})
export class TenantAdministrationModule {}
