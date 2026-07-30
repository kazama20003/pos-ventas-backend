import { Global, Module } from '@nestjs/common';
import { CifradoService } from './cifrado.service';

/** Utilidades de seguridad transversales (cifrado de secretos en reposo). */
@Global()
@Module({
  providers: [CifradoService],
  exports: [CifradoService],
})
export class SeguridadModule {}
