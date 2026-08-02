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
  ActualizarClienteDto,
  CrearClienteDto,
  CuentaCreditoDto,
  RegistrarCobroDto,
} from './dto/clientes.dto';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @RequierePermiso('clientes.crear')
  @Post()
  crear(@Body() dto: CrearClienteDto) {
    return this.clientes.crear(dto);
  }

  @RequierePermiso('clientes.listar')
  @Get()
  listar(@Query('q') q?: string) {
    return this.clientes.listar(q);
  }

  @RequierePermiso('clientes.listar')
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientes.obtener(id);
  }

  @RequierePermiso('clientes.actualizar')
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarClienteDto,
  ) {
    return this.clientes.actualizar(id, dto);
  }

  @RequierePermiso('clientes.actualizar')
  @Post(':id/desactivar')
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientes.desactivar(id);
  }

  @RequierePermiso('clientes.actualizar')
  @Post(':id/cuenta-credito')
  definirCredito(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CuentaCreditoDto,
  ) {
    return this.clientes.definirCuentaCredito(id, dto);
  }

  @RequierePermiso('clientes.listar')
  @Get(':id/cuentas-por-cobrar')
  cuentasPorCobrar(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientes.cuentasPorCobrar(id);
  }

  @RequierePermiso('cobros.registrar')
  @Post('cobros')
  registrarCobro(@Body() dto: RegistrarCobroDto) {
    return this.clientes.registrarCobro(dto);
  }
}
