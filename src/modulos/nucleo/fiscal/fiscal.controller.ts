import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { EmitirComprobanteDto } from './dto/emitir-comprobante.dto';
import { NotaCreditoDto } from './dto/nota-credito.dto';
import { FiscalService } from './fiscal.service';

@Controller('facturacion-electronica')
export class FiscalController {
  constructor(private readonly fiscal: FiscalService) {}

  @RequierePermiso('facturacion.emitir')
  @Post('comprobantes')
  emitir(@Body() dto: EmitirComprobanteDto) {
    return this.fiscal.emitirDesdeVenta(dto);
  }

  @RequierePermiso('facturacion.emitir')
  @Post('notas-credito')
  emitirNota(@Body() dto: NotaCreditoDto) {
    return this.fiscal.emitirNotaCredito(dto);
  }

  @RequierePermiso('facturacion.emitir')
  @Post('comprobantes/:id/reintentar')
  reintentar(@Param('id', ParseUUIDPipe) id: string) {
    return this.fiscal.reintentar(id);
  }

  @RequierePermiso('facturacion.leer')
  @Get('comprobantes')
  listar(@Query('estado') estado?: string, @Query('take') take?: string) {
    return this.fiscal.listar({
      estado,
      take: take ? Number(take) : undefined,
    });
  }

  @RequierePermiso('facturacion.leer')
  @Get('comprobantes/:id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.fiscal.obtener(id);
  }
}
