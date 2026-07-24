import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreContextsModule } from './modulos/nucleo/contextos-nucleo.module';
import { ManagementContextsModule } from './modulos/administracion/contextos-administracion.module';
import { AppConfigModule } from './compartido/configuracion/configuracion-aplicacion.module';
import { CoreDatabaseModule } from './compartido/base-datos/base-datos-operaciones.module';
import { ManagementDatabaseModule } from './compartido/base-datos/base-datos-administracion.module';

@Module({
  imports: [
    AppConfigModule,
    CoreDatabaseModule,
    ManagementDatabaseModule,
    CoreContextsModule,
    ManagementContextsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
