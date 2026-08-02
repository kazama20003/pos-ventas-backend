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

  /** Sucursales donde el usuario autenticado puede operar (para la UI). */
  @Get('mis-sucursales')
  misSucursales() {
    return this.usuarios.misSucursales();
  }

  /** Dato de referencia (id + nombre) usado por varias pantallas de admin. */
  @Get('organizaciones')
  listarOrganizaciones() {
    return this.usuarios.listarOrganizaciones();
  }

  /** Permisos efectivos del usuario autenticado (para gating de UI). */
  @Get('mis-permisos')
  misPermisos() {
    return this.usuarios.misPermisos();
  }

  /** Reenvía el correo de invitación a un usuario aún pendiente (INVITADA). */
  @RequierePermiso('usuarios.crear')
  @Post(':membresiaId/reenviar-invitacion')
  reenviarInvitacion(@Param('membresiaId', ParseUUIDPipe) membresiaId: string) {
    return this.usuarios.reenviarInvitacion(membresiaId);
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
