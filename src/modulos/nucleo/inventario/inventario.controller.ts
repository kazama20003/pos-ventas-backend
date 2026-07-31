import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { RegistrarStockInicialDto } from './dto/registrar-stock-inicial.dto';
import {
  CrearTransferenciaDto,
  RecibirTransferenciaDto,
} from './dto/transferencia.dto';
import { DefinirNivelStockDto } from './dto/nivel-stock.dto';
import { CrearConteoDto, RegistrarConteoDto } from './dto/conteo.dto';
import { CrearReservaDto } from './dto/reserva.dto';
import { InventarioService } from './inventario.service';

@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventario: InventarioService) {}

  @Post('stock-inicial')
  @RequierePermiso('inventario.stock_inicial')
  registrarStockInicial(@Body() dto: RegistrarStockInicialDto) {
    return this.inventario.registrarStockInicial(dto);
  }

  @Post('ajustes')
  @RequierePermiso('inventario.ajustar')
  ajustarStock(@Body() dto: AjustarStockDto) {
    return this.inventario.ajustarStock(dto);
  }

  @Get('stock')
  @RequierePermiso('inventario.listar')
  consolidadoStock(
    @Query('almacenId') almacenId?: string,
    @Query('sucursalId') sucursalId?: string,
    @Query('q') q?: string,
    @Query('soloConStock') soloConStock?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inventario.consolidadoStock({
      almacenId: almacenId || undefined,
      sucursalId: sucursalId || undefined,
      q: q || undefined,
      soloConStock: soloConStock === 'true',
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('alertas')
  @RequierePermiso('inventario.listar')
  alertasReabastecimiento(
    @Query('almacenId') almacenId?: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.inventario.alertasReabastecimiento({
      almacenId: almacenId || undefined,
      sucursalId: sucursalId || undefined,
    });
  }

  @Post('nivel')
  @RequierePermiso('inventario.ajustar')
  definirNivelStock(@Body() dto: DefinirNivelStockDto) {
    return this.inventario.definirNivelStock(dto);
  }

  // ─────────────────────────────── Reservas ─────────────────────────────────

  @Get('reservas')
  @RequierePermiso('inventario.listar')
  listarReservas(
    @Query('almacenId') almacenId?: string,
    @Query('estado') estado?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventario.listarReservas({
      almacenId: almacenId || undefined,
      estado: estado || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('reservas')
  @RequierePermiso('inventario.ajustar')
  crearReserva(@Body() dto: CrearReservaDto) {
    return this.inventario.crearReserva(dto);
  }

  @Post('reservas/:id/liberar')
  @RequierePermiso('inventario.ajustar')
  liberarReserva(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.liberarReserva(id);
  }

  // ───────────────────────────── Conteos físicos ────────────────────────────

  @Get('conteos')
  @RequierePermiso('inventario.listar')
  listarConteos(
    @Query('estado') estado?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventario.listarConteos(
      estado,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('conteos/:id')
  @RequierePermiso('inventario.listar')
  obtenerConteo(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.obtenerConteo(id);
  }

  @Post('conteos')
  @RequierePermiso('inventario.ajustar')
  crearConteo(@Body() dto: CrearConteoDto) {
    return this.inventario.crearConteo(dto);
  }

  @Post('conteos/:id/registrar')
  @RequierePermiso('inventario.ajustar')
  registrarConteo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarConteoDto,
  ) {
    return this.inventario.registrarConteo(id, dto);
  }

  @Post('conteos/:id/contabilizar')
  @RequierePermiso('inventario.ajustar')
  contabilizarConteo(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.contabilizarConteo(id);
  }

  @Post('conteos/:id/cancelar')
  @RequierePermiso('inventario.ajustar')
  cancelarConteo(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.cancelarConteo(id);
  }

  @Get('kardex/:varianteId')
  @RequierePermiso('inventario.listar')
  kardex(
    @Param('varianteId', ParseUUIDPipe) varianteId: string,
    @Query('almacenId') almacenId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventario.kardex(
      varianteId,
      almacenId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // ───────────────────────────── Transferencias ─────────────────────────────

  @Get('transferencias')
  @RequierePermiso('inventario.listar')
  listarTransferencias(
    @Query('estado') estado?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventario.listarTransferencias(
      estado,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('transferencias/:id')
  @RequierePermiso('inventario.listar')
  obtenerTransferencia(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.obtenerTransferencia(id);
  }

  @Post('transferencias')
  @RequierePermiso('inventario.transferir')
  crearTransferencia(@Body() dto: CrearTransferenciaDto) {
    return this.inventario.crearTransferencia(dto);
  }

  @Post('transferencias/:id/recibir')
  @RequierePermiso('inventario.transferir')
  recibirTransferencia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecibirTransferenciaDto,
  ) {
    return this.inventario.recibirTransferencia(id, dto);
  }

  @Post('transferencias/:id/cancelar')
  @RequierePermiso('inventario.transferir')
  cancelarTransferencia(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.cancelarTransferencia(id);
  }
}
