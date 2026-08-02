import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequierePermiso } from '../../nucleo/identidad/decoradores';
import {
  CambiarPlanDto,
  CancelarSuscripcionDto,
  SuscribirDto,
} from './dto/suscripciones.dto';
import { EntitlementsService } from './entitlements.service';
import { SuscripcionesService } from './suscripciones.service';

@Controller('suscripcion')
export class SuscripcionesController {
  constructor(
    private readonly suscripciones: SuscripcionesService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @RequierePermiso('suscripcion.gestionar')
  @Post()
  suscribir(@Body() dto: SuscribirDto) {
    return this.suscripciones.suscribir(dto);
  }

  @RequierePermiso('suscripcion.gestionar')
  @Post('cambiar-plan')
  cambiarPlan(@Body() dto: CambiarPlanDto) {
    return this.suscripciones.cambiarPlan(dto);
  }

  @RequierePermiso('suscripcion.gestionar')
  @Post('cancelar')
  cancelar(@Body() dto: CancelarSuscripcionDto) {
    return this.suscripciones.cancelar(dto);
  }

  @RequierePermiso('suscripcion.leer')
  @Get()
  miSuscripcion() {
    return this.suscripciones.miSuscripcion();
  }

  @RequierePermiso('suscripcion.leer')
  @Get('verificar')
  verificar(
    @Query('caracteristica') caracteristica: string,
    @Query('uso') uso?: string,
  ) {
    return this.entitlements.verificarPorContexto(
      caracteristica,
      uso ? Number(uso) : 0,
    );
  }
}
