import { Module } from '@nestjs/common';
import { BillingModule } from './facturacion/facturacion.module';
import { FeaturesModule } from './caracteristicas/caracteristicas.module';
import { NotificationsModule } from './notificaciones/notificaciones.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PlansModule } from './planes/planes.module';
import { SubscriptionsModule } from './suscripciones/suscripciones.module';
import { TenantAdministrationModule } from './administracion-inquilino/administracion-inquilino.module';
import { UsageModule } from './uso/uso.module';

@Module({
  imports: [
    PlansModule,
    FeaturesModule,
    SubscriptionsModule,
    BillingModule,
    UsageModule,
    TenantAdministrationModule,
    NotificationsModule,
    WebhooksModule,
  ],
})
export class ManagementContextsModule {}
