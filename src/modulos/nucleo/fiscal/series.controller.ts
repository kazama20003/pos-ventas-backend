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
import { CrearSerieDto } from './dto/serie.dto';
import { SeriesService } from './series.service';

@Controller('series')
export class SeriesController {
  constructor(private readonly series: SeriesService) {}

  @RequierePermiso('facturacion.leer')
  @Get()
  listar(@Query('empresaId', ParseUUIDPipe) empresaId: string) {
    return this.series.listar(empresaId);
  }

  @RequierePermiso('facturacion.emitir')
  @Post()
  crear(@Body() dto: CrearSerieDto) {
    return this.series.crear(dto);
  }

  @RequierePermiso('facturacion.emitir')
  @Post(':id/activar')
  activar(@Param('id', ParseUUIDPipe) id: string) {
    return this.series.cambiarEstado(id, true);
  }

  @RequierePermiso('facturacion.emitir')
  @Post(':id/archivar')
  archivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.series.cambiarEstado(id, false);
  }
}
