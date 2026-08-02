import { Body, Controller, Get, Post } from '@nestjs/common';
import { RequierePermiso } from '../../nucleo/identidad/decoradores';
import {
  CrearCuentaFacturacionDto,
  GenerarFacturaDto,
  RegistrarPagoDto,
} from './dto/facturacion.dto';
import { FacturacionService } from './facturacion.service';

@Controller('facturacion-saas')
export class FacturacionController {
  constructor(private readonly facturacion: FacturacionService) {}

  @RequierePermiso('suscripcion.gestionar')
  @Post('cuentas')
  crearCuenta(@Body() dto: CrearCuentaFacturacionDto) {
    return this.facturacion.crearCuenta(dto);
  }

  @RequierePermiso('suscripcion.leer')
  @Get('facturas')
  listar() {
    return this.facturacion.listarFacturas();
  }

  @RequierePermiso('suscripcion.gestionar')
  @Post('facturas')
  generar(@Body() dto: GenerarFacturaDto) {
    return this.facturacion.generarFactura(dto);
  }

  @RequierePermiso('suscripcion.gestionar')
  @Post('pagos')
  pagar(@Body() dto: RegistrarPagoDto) {
    return this.facturacion.registrarPago(dto);
  }
}
