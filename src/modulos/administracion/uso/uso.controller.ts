import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequierePermiso } from '../../nucleo/identidad/decoradores';
import { CrearMedidorDto, RegistrarUsoDto } from './dto/uso.dto';
import { UsoService } from './uso.service';

@Controller()
export class UsoController {
  constructor(private readonly uso: UsoService) {}

  @RequierePermiso('plataforma.gestionar')
  @Post('plataforma/medidores')
  crearMedidor(@Body() dto: CrearMedidorDto) {
    return this.uso.crearMedidor(dto);
  }

  @RequierePermiso('uso.registrar')
  @Post('uso/eventos')
  registrar(@Body() dto: RegistrarUsoDto) {
    return this.uso.registrar(dto);
  }

  @RequierePermiso('suscripcion.leer')
  @Get('uso/resumen')
  resumen(
    @Query('medidor') medidor: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const ahora = new Date();
    return this.uso.resumen(
      medidor,
      desde
        ? new Date(desde)
        : new Date(ahora.getFullYear(), ahora.getMonth(), 1),
      hasta
        ? new Date(hasta)
        : new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1),
    );
  }
}
