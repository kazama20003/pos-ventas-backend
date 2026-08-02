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
  ActualizarCategoriaDto,
  ActualizarProductoDto,
  ActualizarUnidadMedidaDto,
  CrearCategoriaDto,
  CrearImpuestoDto,
  CrearListaPreciosDto,
  ActualizarVarianteDto,
  AgregarCodigoBarrasDto,
  ActualizarMarcaDto,
  CrearMarcaDto,
  CrearProductoDto,
  CrearUnidadMedidaDto,
  CrearVarianteProductoDto,
  ImportarProductosDto,
  ListarProductosQueryDto,
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

  @Patch('categorias/:id')
  @RequierePermiso('catalogo.editar')
  actualizarCategoria(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCategoriaDto,
  ) {
    return this.catalogo.actualizarCategoria(id, dto);
  }

  @Delete('categorias/:id')
  @RequierePermiso('catalogo.eliminar')
  archivarCategoria(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogo.archivarCategoria(id);
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

  @Patch('unidades-medida/:id')
  @RequierePermiso('catalogo.editar')
  actualizarUnidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarUnidadMedidaDto,
  ) {
    return this.catalogo.actualizarUnidad(id, dto);
  }

  @Delete('unidades-medida/:id')
  @RequierePermiso('catalogo.eliminar')
  archivarUnidad(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogo.archivarUnidad(id);
  }

  @Post('marcas')
  @RequierePermiso('catalogo.crear')
  crearMarca(@Body() dto: CrearMarcaDto) {
    return this.catalogo.crearMarca(dto);
  }

  @Get('marcas')
  @RequierePermiso('catalogo.listar')
  listarMarcas() {
    return this.catalogo.listarMarcas();
  }

  @Patch('marcas/:id')
  @RequierePermiso('catalogo.editar')
  actualizarMarca(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarMarcaDto,
  ) {
    return this.catalogo.actualizarMarca(id, dto);
  }

  @Delete('marcas/:id')
  @RequierePermiso('catalogo.eliminar')
  archivarMarca(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogo.archivarMarca(id);
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
  listarProductos(@Query() query: ListarProductosQueryDto) {
    return this.catalogo.listarProductos(query);
  }

  @Post('productos/importar')
  @RequierePermiso('catalogo.crear')
  importarProductos(@Body() dto: ImportarProductosDto) {
    return this.catalogo.importarProductos(dto);
  }

  @Get('barcode-interno')
  @RequierePermiso('catalogo.crear')
  generarBarcodeInterno() {
    return this.catalogo.generarCodigoBarrasInterno();
  }

  @Get('productos/barcode/:codigo')
  @RequierePermiso('catalogo.listar')
  buscarPorCodigoBarras(@Param('codigo') codigo: string) {
    return this.catalogo.buscarPorCodigoBarras(codigo);
  }

  @Get('productos/:id')
  @RequierePermiso('catalogo.listar')
  obtenerProducto(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogo.obtenerProducto(id);
  }

  @Patch('productos/:id')
  @RequierePermiso('catalogo.editar')
  actualizarProducto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarProductoDto,
  ) {
    return this.catalogo.actualizarProducto(id, dto);
  }

  @Delete('productos/:id')
  @RequierePermiso('catalogo.eliminar')
  archivarProducto(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogo.archivarProducto(id);
  }

  // ---- Variantes ----

  @Post('productos/:id/variantes')
  @RequierePermiso('catalogo.editar')
  agregarVariante(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearVarianteProductoDto,
  ) {
    return this.catalogo.agregarVariante(id, dto);
  }

  @Patch('productos/:id/variantes/:varianteId')
  @RequierePermiso('catalogo.editar')
  actualizarVariante(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
    @Body() dto: ActualizarVarianteDto,
  ) {
    return this.catalogo.actualizarVariante(id, varianteId, dto);
  }

  @Delete('productos/:id/variantes/:varianteId')
  @RequierePermiso('catalogo.editar')
  archivarVariante(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
  ) {
    return this.catalogo.archivarVariante(id, varianteId);
  }

  // ---- Códigos de barras ----

  @Post('variantes/:varianteId/barcodes')
  @RequierePermiso('catalogo.editar')
  agregarBarcode(
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
    @Body() dto: AgregarCodigoBarrasDto,
  ) {
    return this.catalogo.agregarBarcode(varianteId, dto);
  }

  @Delete('variantes/:varianteId/barcodes/:barcodeId')
  @RequierePermiso('catalogo.editar')
  quitarBarcode(
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
    @Param('barcodeId', ParseUUIDPipe) barcodeId: string,
  ) {
    return this.catalogo.quitarBarcode(varianteId, barcodeId);
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
