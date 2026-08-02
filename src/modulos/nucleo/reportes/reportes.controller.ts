import { Controller, Get, Query } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { ReportesService } from './reportes.service';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @RequierePermiso('reportes.leer')
  @Get('dashboard')
  dashboard() {
    return this.reportes.dashboard();
  }

  @RequierePermiso('reportes.leer')
  @Get('ventas')
  ventas(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.reportes.ventasResumen(
      this.rango(desde, hasta),
      sucursalId || undefined,
    );
  }

  @RequierePermiso('reportes.leer')
  @Get('ventas-por-dia')
  ventasPorDia(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.reportes.ventasPorDia(
      this.rango(desde, hasta),
      sucursalId || undefined,
    );
  }

  @RequierePermiso('reportes.leer')
  @Get('ventas-por-sucursal')
  ventasPorSucursal(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.reportes.ventasPorSucursal(this.rango(desde, hasta));
  }

  @RequierePermiso('reportes.leer')
  @Get('por-sucursal')
  reporteSucursales(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.reportes.reporteSucursales(this.rango(desde, hasta));
  }

  @RequierePermiso('reportes.leer')
  @Get('top-productos')
  topProductos(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('limite') limite?: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.reportes.topProductos(
      this.rango(desde, hasta),
      limite ? Number(limite) : undefined,
      sucursalId || undefined,
    );
  }

  @RequierePermiso('reportes.leer')
  @Get('inventario-valorizado')
  inventario(@Query('almacenId') almacenId?: string) {
    return this.reportes.inventarioValorizado(almacenId);
  }

  @RequierePermiso('reportes.leer')
  @Get('cuentas-por-cobrar')
  cuentasPorCobrar() {
    return this.reportes.cuentasPorCobrar();
  }

  @RequierePermiso('reportes.leer')
  @Get('cuentas-por-pagar')
  cuentasPorPagar() {
    return this.reportes.cuentasPorPagar();
  }

  /** Parses date query params, defaulting to the current month if absent. */
  private rango(desde?: string, hasta?: string) {
    const ahora = new Date();
    return {
      desde: desde
        ? new Date(desde)
        : new Date(ahora.getFullYear(), ahora.getMonth(), 1),
      hasta: hasta
        ? new Date(hasta)
        : new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1),
    };
  }
}
