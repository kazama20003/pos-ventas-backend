import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreContextsModule } from './modulos/nucleo/contextos-nucleo.module';
import { ManagementContextsModule } from './modulos/administracion/contextos-administracion.module';
import { AppConfigModule } from './compartido/configuracion/configuracion-aplicacion.module';
import { CorreoModule } from './compartido/correo/correo.module';
import { ContextoModule } from './compartido/contexto/contexto.module';
import { SeguridadModule } from './compartido/seguridad/seguridad.module';
import { CoreDatabaseModule } from './compartido/base-datos/base-datos-operaciones.module';
import { ManagementDatabaseModule } from './compartido/base-datos/base-datos-administracion.module';
import { GuardJwt } from './modulos/nucleo/identidad/guard-jwt';
import { GuardPermisos } from './modulos/nucleo/identidad/guard-permisos';
import { InterceptorContexto } from './modulos/nucleo/identidad/interceptor-contexto';

@Module({
  imports: [
    AppConfigModule,
    CorreoModule,
    ContextoModule,
    SeguridadModule,
    CoreDatabaseModule,
    ManagementDatabaseModule,
    CoreContextsModule,
    ManagementContextsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: authenticate first, then authorize.
    { provide: APP_GUARD, useClass: GuardJwt },
    { provide: APP_GUARD, useClass: GuardPermisos },
    { provide: APP_INTERCEPTOR, useClass: InterceptorContexto },
  ],
})
export class AppModule {}
