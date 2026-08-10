import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Publico, Usuario } from '../identidad/decoradores';
import { UsuarioAutenticado } from '../identidad/autenticacion.tipos';
import { RegistrarEmpresaDto } from './dto/registrar.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Publico()
  @Post('registrar')
  @HttpCode(201)
  registrar(@Body() dto: RegistrarEmpresaDto) {
    return this.onboarding.registrar(dto);
  }

  /** Estado de la guía de primera venta (paso actual derivado de datos reales). */
  @Get('estado')
  estado(@Usuario() usuario: UsuarioAutenticado) {
    return this.onboarding.estado(usuario.inquilinoId);
  }

  /** Descarta la guía (el usuario la cierra). */
  @Patch('estado/descartar')
  descartar(@Usuario() usuario: UsuarioAutenticado) {
    return this.onboarding.descartar(usuario.inquilinoId);
  }
}
