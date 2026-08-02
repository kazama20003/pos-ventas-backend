import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

/** Módulo F — Clientes (CRM) + cuentas por cobrar. */
@Module({
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class CustomersModule {}
