import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Publico, RequierePermiso } from '../identidad/decoradores';
import { CrearIntentoDto, RegistrarCuentaProveedorDto } from './dto/pagos.dto';
import { PagosService } from './pagos.service';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @RequierePermiso('pagos.configurar')
  @Post('cuentas')
  registrarCuenta(@Body() dto: RegistrarCuentaProveedorDto) {
    return this.pagos.registrarCuenta(dto);
  }

  @RequierePermiso('pagos.cobrar')
  @Post('intentos')
  crearIntento(@Body() dto: CrearIntentoDto) {
    return this.pagos.crearIntento(dto);
  }

  @RequierePermiso('pagos.leer')
  @Get('intentos/:id')
  consultar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pagos.consultarIntento(id);
  }

  /**
   * Webhook entrante de la pasarela. Público (sin JWT): la autenticidad se valida
   * por la firma del proveedor dentro de interpretarWebhook.
   */
  @Publico()
  @HttpCode(200)
  @Post('webhooks/:proveedor')
  webhook(
    @Param('proveedor') proveedor: string,
    @Body() cuerpo: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.pagos.procesarWebhook(
      proveedor,
      Buffer.from(JSON.stringify(cuerpo ?? {})),
      headers,
    );
  }
}
