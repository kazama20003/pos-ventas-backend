import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { AsignarPermisosDto, CrearRolDto } from './dto/roles.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @RequierePermiso('roles.crear')
  @Post()
  crear(@Body() dto: CrearRolDto) {
    return this.roles.crear(dto);
  }

  @RequierePermiso('roles.listar')
  @Get()
  listar() {
    return this.roles.listar();
  }

  @RequierePermiso('roles.asignar')
  @Put(':rolId/permisos')
  asignarPermisos(
    @Param('rolId', ParseUUIDPipe) rolId: string,
    @Body() dto: AsignarPermisosDto,
  ) {
    return this.roles.asignarPermisos(rolId, dto);
  }
}
