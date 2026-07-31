import { Module } from '@nestjs/common';
import { IdentityModule } from '../identidad/identidad.module';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [IdentityModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class SalesModule {}
