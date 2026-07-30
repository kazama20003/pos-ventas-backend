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
  ActualizarProveedorDto,
  CrearProveedorDto,
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
}
