import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './configuracion-aplicacion.service';

@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
