import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../../administracion/suscripciones/suscripciones.module';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogModule {}
