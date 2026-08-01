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
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { MovimientoCajaDto } from './dto/movimiento-caja.dto';
import { CajaService } from './caja.service';

@Controller('caja')
export class CajaController {
  constructor(private readonly caja: CajaService) {}

  @Post('sesiones')
  @RequierePermiso('caja.abrir')
  abrir(@Body() dto: AbrirCajaDto) {
    return this.caja.abrir(dto);
  }

  @Get('sesiones/abierta')
  @RequierePermiso('caja.abrir')
  sesionAbierta(@Query('sucursalId', ParseUUIDPipe) sucursalId: string) {
    return this.caja.sesionAbierta(sucursalId);
  }

  @Get('sesiones')
  @RequierePermiso('caja.abrir')
  listarSesiones(
    @Query('sucursalId', ParseUUIDPipe) sucursalId: string,
    @Query('limite') limite?: string,
  ) {
    return this.caja.listarSesiones(sucursalId, Number(limite) || 20);
  }

  @Get('sesiones/:id/resumen')
  @RequierePermiso('caja.abrir')
  resumen(@Param('id', ParseUUIDPipe) id: string) {
    return this.caja.resumen(id);
  }

  @Get('sesiones/:id/movimientos')
  @RequierePermiso('caja.abrir')
  movimientos(@Param('id', ParseUUIDPipe) id: string) {
    return this.caja.movimientos(id);
  }

  @Post('sesiones/movimiento')
  @RequierePermiso('caja.abrir')
  registrarMovimiento(@Body() dto: MovimientoCajaDto) {
    return this.caja.registrarMovimiento(dto);
  }

  @Post('sesiones/cerrar')
  @RequierePermiso('caja.cerrar')
  cerrar(@Body() dto: CerrarCajaDto) {
    return this.caja.cerrar(dto);
  }
}
