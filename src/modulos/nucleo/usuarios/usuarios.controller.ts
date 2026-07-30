import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import {
  ActualizarUsuarioDto,
  CambiarEstadoUsuarioDto,
  CrearUsuarioDto,
} from './dto/usuarios.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @RequierePermiso('usuarios.crear')
  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuarios.crear(dto);
  }

  @RequierePermiso('usuarios.listar')
  @Get()
  listar() {
    return this.usuarios.listar();
  }

  @RequierePermiso('usuarios.actualizar')
  @Patch(':membresiaId')
  actualizar(
    @Param('membresiaId', ParseUUIDPipe) membresiaId: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.usuarios.actualizar(membresiaId, dto);
  }

  @RequierePermiso('usuarios.desactivar')
  @Patch(':membresiaId/estado')
  cambiarEstado(
    @Param('membresiaId', ParseUUIDPipe) membresiaId: string,
    @Body() dto: CambiarEstadoUsuarioDto,
  ) {
    return this.usuarios.cambiarEstado(membresiaId, dto);
  }
}
