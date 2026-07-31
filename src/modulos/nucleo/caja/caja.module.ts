import { Module } from '@nestjs/common';
import { IdentityModule } from '../identidad/identidad.module';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

@Module({
  imports: [IdentityModule],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CashRegisterModule {}
