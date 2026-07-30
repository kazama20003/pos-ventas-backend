import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import {
  CrearOrdenCompraDto,
  PagarProveedorDto,
  RecepcionarDto,
} from './dto/compras.dto';
import { ComprasService } from './compras.service';

@Controller('compras')
export class ComprasController {
  constructor(private readonly compras: ComprasService) {}

  @RequierePermiso('compras.crear')
  @Post('ordenes')
  crearOrden(@Body() dto: CrearOrdenCompraDto) {
    return this.compras.crearOrden(dto);
  }

  @RequierePermiso('compras.listar')
  @Get('ordenes')
  listarOrdenes(@Query('proveedorId') proveedorId?: string) {
    return this.compras.listarOrdenes(proveedorId);
  }

  @RequierePermiso('compras.recepcionar')
  @Post('recepciones')
  recepcionar(@Body() dto: RecepcionarDto) {
    return this.compras.recepcionar(dto);
  }

  @RequierePermiso('compras.pagar')
  @Post('pagos')
  pagar(@Body() dto: PagarProveedorDto) {
    return this.compras.pagarProveedor(dto);
  }
}
