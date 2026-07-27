import { Body, Controller, Post } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { VentasService } from './ventas.service';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

  @RequierePermiso('ventas.crear')
  @Post()
  crear(@Body() dto: CrearVentaDto) {
    return this.ventas.crear(dto);
  }
}
