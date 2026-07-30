import { Body, Controller, Post } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CajaService } from './caja.service';

@Controller('caja')
export class CajaController {
  constructor(private readonly caja: CajaService) {}

  @Post('sesiones')
  @RequierePermiso('caja.abrir')
  abrir(@Body() dto: AbrirCajaDto) {
    return this.caja.abrir(dto);
  }
}
