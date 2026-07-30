import { Body, Controller, Get, Post } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import {
  CrearCategoriaDto,
  CrearImpuestoDto,
  CrearListaPreciosDto,
  CrearProductoDto,
  CrearUnidadMedidaDto,
} from './dto/catalogo.dto';
import { CatalogoService } from './catalogo.service';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Post('categorias')
  @RequierePermiso('catalogo.crear')
  crearCategoria(@Body() dto: CrearCategoriaDto) {
    return this.catalogo.crearCategoria(dto);
  }

  @Get('categorias')
  @RequierePermiso('catalogo.listar')
  listarCategorias() {
    return this.catalogo.listarCategorias();
  }

  @Post('unidades-medida')
  @RequierePermiso('catalogo.crear')
  crearUnidad(@Body() dto: CrearUnidadMedidaDto) {
    return this.catalogo.crearUnidad(dto);
  }

  @Get('unidades-medida')
  @RequierePermiso('catalogo.listar')
  listarUnidades() {
    return this.catalogo.listarUnidades();
  }

  @Post('impuestos')
  @RequierePermiso('catalogo.crear')
  crearImpuesto(@Body() dto: CrearImpuestoDto) {
    return this.catalogo.crearImpuesto(dto);
  }

  @Get('impuestos')
  @RequierePermiso('catalogo.listar')
  listarImpuestos() {
    return this.catalogo.listarImpuestos();
  }

  @Post('productos')
  @RequierePermiso('catalogo.crear')
  crearProducto(@Body() dto: CrearProductoDto) {
    return this.catalogo.crearProducto(dto);
  }

  @Get('productos')
  @RequierePermiso('catalogo.listar')
  listarProductos() {
    return this.catalogo.listarProductos();
  }

  @Post('listas-precios')
  @RequierePermiso('catalogo.crear')
  crearListaPrecios(@Body() dto: CrearListaPreciosDto) {
    return this.catalogo.crearListaPrecios(dto);
  }

  @Get('listas-precios')
  @RequierePermiso('catalogo.listar')
  listarListasPrecios() {
    return this.catalogo.listarListasPrecios();
  }
}
