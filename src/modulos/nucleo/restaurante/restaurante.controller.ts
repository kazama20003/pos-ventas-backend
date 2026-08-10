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
import { RestauranteService } from './restaurante.service';
import {
  AbrirComandaDto,
  ActualizarCocinaDto,
  ActualizarMesaDto,
  AgregarItemDto,
  CobrarComandaDto,
  CrearMesaDto,
} from './dto/restaurante.dto';

@Controller('restaurante')
export class RestauranteController {
  constructor(private readonly restaurante: RestauranteService) {}

  // ─────────────────────────────── Mesas ────────────────────────────────────

  @Post('mesas')
  @RequierePermiso('restaurante.gestionar')
  crearMesa(@Body() dto: CrearMesaDto) {
    return this.restaurante.crearMesa(dto);
  }

  @Get('mesas')
  @RequierePermiso('restaurante.leer')
  listarMesas(@Query('sucursalId') sucursalId?: string) {
    return this.restaurante.listarMesas(sucursalId || undefined);
  }

  @Patch('mesas/:id')
  @RequierePermiso('restaurante.gestionar')
  actualizarMesa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarMesaDto,
  ) {
    return this.restaurante.actualizarMesa(id, dto);
  }

  @Delete('mesas/:id')
  @RequierePermiso('restaurante.gestionar')
  archivarMesa(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurante.archivarMesa(id);
  }

  @Get('mapa')
  @RequierePermiso('restaurante.leer')
  mapaMesas(@Query('sucursalId', ParseUUIDPipe) sucursalId: string) {
    return this.restaurante.mapaMesas(sucursalId);
  }

  // ────────────────────────────── Comandas ──────────────────────────────────

  @Post('comandas')
  @RequierePermiso('restaurante.operar')
  abrirComanda(@Body() dto: AbrirComandaDto) {
    return this.restaurante.abrirComanda(dto);
  }

  @Get('comandas')
  @RequierePermiso('restaurante.leer')
  listarComandas(
    @Query('sucursalId') sucursalId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.restaurante.listarComandas(
      sucursalId || undefined,
      estado || undefined,
    );
  }

  @Get('comandas/:id')
  @RequierePermiso('restaurante.leer')
  obtenerComanda(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurante.obtenerComanda(id);
  }

  @Post('comandas/:id/items')
  @RequierePermiso('restaurante.operar')
  agregarItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AgregarItemDto,
  ) {
    return this.restaurante.agregarItem(id, dto);
  }

  @Delete('items/:itemId')
  @RequierePermiso('restaurante.operar')
  quitarItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.restaurante.quitarItem(itemId);
  }

  @Post('comandas/:id/enviar-cocina')
  @RequierePermiso('restaurante.operar')
  enviarCocina(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurante.enviarCocina(id);
  }

  @Post('comandas/:id/cancelar')
  @RequierePermiso('restaurante.operar')
  cancelarComanda(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurante.cancelarComanda(id);
  }

  @Post('comandas/:id/cobrar')
  @RequierePermiso('restaurante.cobrar')
  cobrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CobrarComandaDto,
  ) {
    return this.restaurante.cobrar(id, dto);
  }

  // ─────────────────────────────────── KDS ──────────────────────────────────

  @Get('kds')
  @RequierePermiso('restaurante.cocina')
  kds(
    @Query('sucursalId', ParseUUIDPipe) sucursalId: string,
    @Query('estacion') estacion?: string,
  ) {
    return this.restaurante.kds(sucursalId, estacion || undefined);
  }

  @Patch('items/:itemId/cocina')
  @RequierePermiso('restaurante.cocina')
  actualizarCocina(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ActualizarCocinaDto,
  ) {
    return this.restaurante.actualizarCocina(itemId, dto);
  }
}
