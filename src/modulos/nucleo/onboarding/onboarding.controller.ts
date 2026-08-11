import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Publico, Usuario } from '../identidad/decoradores';
import { UsuarioAutenticado } from '../identidad/autenticacion.tipos';
import { ActualizarPasoOnboardingDto } from './dto/progreso.dto';
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

  /**
   * Flujos de onboarding contextual: pasos derivados de eventos reales del
   * tenant + overrides del usuario (omitido/descartado).
   */
  @Get('flujos')
  flujos(@Usuario() usuario: UsuarioAutenticado) {
    return this.onboarding.flujos(
      usuario.inquilinoId,
      usuario.identidadUsuarioId,
    );
  }

  /** Override manual de un paso (o '_flow' para descartar el flujo entero). */
  @Patch('flujos/:flowKey/pasos/:stepKey')
  actualizarPaso(
    @Usuario() usuario: UsuarioAutenticado,
    @Param('flowKey') flowKey: string,
    @Param('stepKey') stepKey: string,
    @Body() dto: ActualizarPasoOnboardingDto,
  ) {
    return this.onboarding.actualizarPaso(
      usuario.inquilinoId,
      usuario.identidadUsuarioId,
      flowKey,
      stepKey,
      dto.status,
    );
  }
}
