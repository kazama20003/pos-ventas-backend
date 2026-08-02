import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RequierePermiso } from '../../nucleo/identidad/decoradores';
import { EmitirEventoDto, RegistrarEndpointDto } from './dto/webhooks.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @RequierePermiso('webhooks.gestionar')
  @Post('endpoints')
  registrar(@Body() dto: RegistrarEndpointDto) {
    return this.webhooks.registrarEndpoint(dto);
  }

  @RequierePermiso('webhooks.gestionar')
  @Get('endpoints')
  listar() {
    return this.webhooks.listarEndpoints();
  }

  @RequierePermiso('webhooks.gestionar')
  @Post('endpoints/:id/desactivar')
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooks.desactivarEndpoint(id);
  }

  @RequierePermiso('webhooks.gestionar')
  @Post('emitir')
  emitir(@Body() dto: EmitirEventoDto) {
    return this.webhooks.emitir(dto);
  }
}
