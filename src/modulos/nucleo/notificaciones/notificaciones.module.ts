import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

/** Notificaciones a usuarios del tenant (bandeja in-app). */
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
})
export class NotificationsModule {}
