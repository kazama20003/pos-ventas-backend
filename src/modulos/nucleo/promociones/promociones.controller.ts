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
  ActualizarPromocionDto,
  CrearPromocionDto,
  EstadoPromocionDto,
  ListarPromocionesDto,
  PromocionesAplicablesDto,
} from './dto/promociones.dto';
import { PromocionesService } from './promociones.service';

@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promociones: PromocionesService) {}

  @RequierePermiso('catalogo.crear')
  @Post()
  crear(@Body() dto: CrearPromocionDto) {
    return this.promociones.crearPromocion(dto);
  }

  @RequierePermiso('catalogo.listar')
  @Get()
  listar(@Query() dto: ListarPromocionesDto) {
    return this.promociones.listarPromociones(dto);
  }

  // Vista previa para caja: descuentos que aplican a un carrito.
  @RequierePermiso('ventas.crear')
  @Post('aplicables')
  aplicables(@Body() dto: PromocionesAplicablesDto) {
    return this.promociones.aplicables(dto);
  }

  @RequierePermiso('catalogo.listar')
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.promociones.obtenerPromocion(id);
  }

  @RequierePermiso('catalogo.crear')
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarPromocionDto,
  ) {
    return this.promociones.actualizarPromocion(id, dto);
  }

  @RequierePermiso('catalogo.crear')
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: EstadoPromocionDto,
  ) {
    return this.promociones.cambiarEstadoPromocion(id, estado);
  }
}
