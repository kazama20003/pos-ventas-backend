import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CajaService } from './caja.service';

@Controller('caja')
export class CajaController {
  constructor(private readonly caja: CajaService) {}

  @Post('sesiones')
  @RequierePermiso('caja.abrir')
  abrir(@Body() dto: AbrirCajaDto) {
    return this.caja.abrir(dto);
  }

  @Get('sesiones/:id/resumen')
  @RequierePermiso('caja.abrir')
  resumen(@Param('id', ParseUUIDPipe) id: string) {
    return this.caja.resumen(id);
  }

  @Post('sesiones/cerrar')
  @RequierePermiso('caja.cerrar')
  cerrar(@Body() dto: CerrarCajaDto) {
    return this.caja.cerrar(dto);
  }
}
