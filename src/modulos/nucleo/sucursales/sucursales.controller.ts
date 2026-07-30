import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import {
  CrearAlmacenDto,
  CrearCajaDto,
  CrearSucursalDto,
} from './dto/sucursales.dto';
import { SucursalesService } from './sucursales.service';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursales: SucursalesService) {}

  @RequierePermiso('sucursales.gestionar')
  @Post()
  crearSucursal(@Body() dto: CrearSucursalDto) {
    return this.sucursales.crearSucursal(dto);
  }

  @RequierePermiso('sucursales.leer')
  @Get()
  listarSucursales() {
    return this.sucursales.listarSucursales();
  }

  @RequierePermiso('sucursales.gestionar')
  @Post('almacenes')
  crearAlmacen(@Body() dto: CrearAlmacenDto) {
    return this.sucursales.crearAlmacen(dto);
  }

  @RequierePermiso('sucursales.leer')
  @Get('almacenes')
  listarAlmacenes(@Query('sucursalId') sucursalId?: string) {
    return this.sucursales.listarAlmacenes(sucursalId);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post('cajas')
  crearCaja(@Body() dto: CrearCajaDto) {
    return this.sucursales.crearCaja(dto);
  }

  @RequierePermiso('sucursales.leer')
  @Get('cajas')
  listarCajas(@Query('sucursalId') sucursalId?: string) {
    return this.sucursales.listarCajas(sucursalId);
  }
}
