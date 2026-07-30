import { Body, Controller, Post } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { CrearDevolucionDto } from './dto/crear-devolucion.dto';
import { SincronizarVentasDto } from './dto/sincronizar-ventas.dto';
import { VentasService } from './ventas.service';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

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
