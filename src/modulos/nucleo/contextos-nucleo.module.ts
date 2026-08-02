import { Module } from '@nestjs/common';
import { FilesModule } from './archivos/archivos.module';
import { AuditModule } from './auditoria/auditoria.module';
import { CashRegisterModule } from './caja/caja.module';
import { CatalogModule } from './catalogo/catalogo.module';
import { CustomersModule } from './clientes/clientes.module';
import { CompaniesModule } from './empresas/empresas.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { IdentityModule } from './identidad/identidad.module';
import { IntegrationsModule } from './integraciones/integraciones.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { InventoryModule } from './inventario/inventario.module';
import { PaymentsModule } from './pagos/pagos.module';
import { PurchasesModule } from './compras/compras.module';
import { ReportsModule } from './reportes/reportes.module';
import { BranchesModule } from './sucursales/sucursales.module';
import { SuppliersModule } from './proveedores/proveedores.module';
import { SalesModule } from './ventas/ventas.module';
import { TenancyModule } from './multitenencia/multitenencia.module';
import { UsersModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    TenancyModule,
    IdentityModule,
    OnboardingModule,
    UsersModule,
    CompaniesModule,
    BranchesModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    CashRegisterModule,
    PaymentsModule,
    FiscalModule,
    PurchasesModule,
    CustomersModule,
    SuppliersModule,
    ReportsModule,
    IntegrationsModule,
    AuditModule,
    FilesModule,
  ],
})
export class CoreContextsModule {}
