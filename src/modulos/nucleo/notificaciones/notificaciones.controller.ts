import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { CrearNotificacionDto } from './dto/notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @RequierePermiso('notificaciones.gestionar')
  @Post()
  crear(@Body() dto: CrearNotificacionDto) {
    return this.notificaciones.crear(dto);
  }

  @RequierePermiso('notificaciones.leer')
  @Get()
  listar(@Query('noLeidas') noLeidas?: string) {
    return this.notificaciones.listar(noLeidas === 'true');
  }

  @RequierePermiso('notificaciones.leer')
  @Post(':id/leer')
  marcarLeida(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificaciones.marcarLeida(id);
  }
}
