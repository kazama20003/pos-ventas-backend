import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Publico } from './modulos/nucleo/identidad/decoradores';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Publico()
  @Get('health')
  health(): { status: 'ok' } {
    return this.appService.health();
  }
}
