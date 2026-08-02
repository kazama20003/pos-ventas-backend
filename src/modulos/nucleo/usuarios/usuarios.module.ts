import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../../administracion/suscripciones/suscripciones.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [UsuariosController, RolesController],
  providers: [UsuariosService, RolesService],
})
export class UsersModule {}
