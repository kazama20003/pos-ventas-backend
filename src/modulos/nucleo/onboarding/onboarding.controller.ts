import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Publico } from '../identidad/decoradores';
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
}
