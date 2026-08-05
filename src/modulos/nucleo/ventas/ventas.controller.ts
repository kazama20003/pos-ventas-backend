import {
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { CrearDevolucionDto } from './dto/crear-devolucion.dto';
import { ListarVentasDto } from './dto/listar-ventas.dto';
import { SincronizarVentasDto } from './dto/sincronizar-ventas.dto';
import { VentasService } from './ventas.service';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

  @RequierePermiso('ventas.crear')
  @Get('contexto')
  contexto(@Query('sucursalId', ParseUUIDPipe) sucursalId: string) {
    return this.ventas.contextoPos(sucursalId);
  }

  @RequierePermiso('ventas.crear')
  @Get()
  listar(@Query() dto: ListarVentasDto) {
    return this.ventas.listarVentas(dto);
  }

  @RequierePermiso('ventas.crear')
  @Post()
  crear(@Body() dto: CrearVentaDto) {
    return this.ventas.crear(dto);
  }

  @RequierePermiso('ventas.devolver')
  @Post('devoluciones')
  devolver(@Body() dto: CrearDevolucionDto) {
    return this.ventas.devolver(dto);
  }

  @RequierePermiso('ventas.crear')
  @Post('sincronizar')
  sincronizar(@Body() dto: SincronizarVentasDto) {
    return this.ventas.sincronizar(dto);
  }
}
