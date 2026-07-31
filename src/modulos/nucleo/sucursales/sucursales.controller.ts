import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import {
  ActualizarAlmacenDto,
  ActualizarCajaDto,
  ActualizarSucursalDto,
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
  @Patch(':id')
  actualizarSucursal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarSucursalDto,
  ) {
    return this.sucursales.actualizarSucursal(id, dto);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post(':id/archivar')
  archivarSucursal(@Param('id', ParseUUIDPipe) id: string) {
    return this.sucursales.cambiarEstadoSucursal(id, true);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post(':id/reactivar')
  reactivarSucursal(@Param('id', ParseUUIDPipe) id: string) {
    return this.sucursales.cambiarEstadoSucursal(id, false);
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
  @Patch('almacenes/:id')
  actualizarAlmacen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarAlmacenDto,
  ) {
    return this.sucursales.actualizarAlmacen(id, dto);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post('almacenes/:id/predeterminado')
  marcarAlmacenPredeterminado(@Param('id', ParseUUIDPipe) id: string) {
    return this.sucursales.marcarAlmacenPredeterminado(id);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post('almacenes/:id/archivar')
  archivarAlmacen(@Param('id', ParseUUIDPipe) id: string) {
    return this.sucursales.cambiarEstadoAlmacen(id, true);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post('almacenes/:id/reactivar')
  reactivarAlmacen(@Param('id', ParseUUIDPipe) id: string) {
    return this.sucursales.cambiarEstadoAlmacen(id, false);
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

  @RequierePermiso('sucursales.gestionar')
  @Patch('cajas/:id')
  actualizarCaja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCajaDto,
  ) {
    return this.sucursales.actualizarCaja(id, dto);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post('cajas/:id/archivar')
  archivarCaja(@Param('id', ParseUUIDPipe) id: string) {
    return this.sucursales.cambiarEstadoCaja(id, true);
  }

  @RequierePermiso('sucursales.gestionar')
  @Post('cajas/:id/reactivar')
  reactivarCaja(@Param('id', ParseUUIDPipe) id: string) {
    return this.sucursales.cambiarEstadoCaja(id, false);
  }
}
