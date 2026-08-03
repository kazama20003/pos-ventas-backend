import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import {
  ActualizarProductoProveedorDto,
  ActualizarProveedorDto,
  CrearProveedorDto,
  VincularProductoProveedorDto,
} from './dto/proveedores.dto';
import { ProveedoresService } from './proveedores.service';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedores: ProveedoresService) {}

  @RequierePermiso('proveedores.crear')
  @Post()
  crear(@Body() dto: CrearProveedorDto) {
    return this.proveedores.crear(dto);
  }

  @RequierePermiso('proveedores.listar')
  @Get()
  listar(@Query('q') q?: string) {
    return this.proveedores.listar(q);
  }

  @RequierePermiso('proveedores.listar')
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedores.obtener(id);
  }

  @RequierePermiso('proveedores.actualizar')
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarProveedorDto,
  ) {
    return this.proveedores.actualizar(id, dto);
  }

  @RequierePermiso('proveedores.actualizar')
  @Post(':id/desactivar')
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedores.desactivar(id);
  }

  // --- Catálogo de aprovisionamiento (producto ↔ proveedor) ---

  @RequierePermiso('proveedores.actualizar')
  @Post(':id/productos')
  vincularProducto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VincularProductoProveedorDto,
  ) {
    return this.proveedores.vincularProducto(id, dto);
  }

  @RequierePermiso('proveedores.listar')
  @Get(':id/productos')
  listarProductos(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedores.listarProductos(id);
  }

  @RequierePermiso('proveedores.listar')
  @Get('producto/:varianteId')
  proveedoresDeVariante(
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
  ) {
    return this.proveedores.proveedoresDeVariante(varianteId);
  }

  @RequierePermiso('proveedores.actualizar')
  @Patch(':id/productos/:varianteId')
  actualizarProducto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
    @Body() dto: ActualizarProductoProveedorDto,
  ) {
    return this.proveedores.actualizarProducto(id, varianteId, dto);
  }

  @RequierePermiso('proveedores.actualizar')
  @Delete(':id/productos/:varianteId')
  desvincularProducto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
  ) {
    return this.proveedores.desvincularProducto(id, varianteId);
  }
}
