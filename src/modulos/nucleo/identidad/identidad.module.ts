import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '../../../compartido/configuracion/configuracion-aplicacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { EstrategiaJwt } from './estrategia-jwt';
import { GuardPermisos } from './guard-permisos';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn },
      }),
    }),
  ],
  controllers: [AutenticacionController],
  providers: [AutenticacionService, EstrategiaJwt, GuardPermisos],
  exports: [GuardPermisos],
})
export class IdentityModule {}
