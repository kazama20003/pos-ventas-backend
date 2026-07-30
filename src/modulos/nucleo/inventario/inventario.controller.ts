import { Body, Controller, Post } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { RegistrarStockInicialDto } from './dto/registrar-stock-inicial.dto';
import { InventarioService } from './inventario.service';

@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventario: InventarioService) {}

  @Post('stock-inicial')
  @RequierePermiso('inventario.stock_inicial')
  registrarStockInicial(@Body() dto: RegistrarStockInicialDto) {
    return this.inventario.registrarStockInicial(dto);
  }
}
