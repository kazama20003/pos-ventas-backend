import { Module } from '@nestjs/common';
import { SalesModule } from '../ventas/ventas.module';
import { RestauranteController } from './restaurante.controller';
import { RestauranteService } from './restaurante.service';

@Module({
  imports: [SalesModule],
  controllers: [RestauranteController],
  providers: [RestauranteService],
})
export class RestauranteModule {}
