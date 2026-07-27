import { Global, Module } from '@nestjs/common';
import { ContextoSolicitudService } from './contexto-solicitud.service';

@Global()
@Module({
  providers: [ContextoSolicitudService],
  exports: [ContextoSolicitudService],
})
export class ContextoModule {}
