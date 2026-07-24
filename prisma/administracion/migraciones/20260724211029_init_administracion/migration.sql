-- CreateEnum
CREATE TYPE "EstadoCicloVidaInquilino" AS ENUM ('APROVISIONANDO', 'EN_PRUEBA', 'ACTIVO', 'PERIODO_GRACIA', 'SUSPENDIDO', 'PENDIENTE_ELIMINACION', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "TipoPeriodoCicloVida" AS ENUM ('PRUEBA', 'GRACIA', 'SUSPENSION');

-- CreateEnum
CREATE TYPE "EstadoPeriodoCicloVida" AS ENUM ('PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoVersionPlan" AS ENUM ('BORRADOR', 'ACTIVA', 'RETIRADA');

-- CreateEnum
CREATE TYPE "TipoValorCaracteristica" AS ENUM ('BOOLEANO', 'ENTERO', 'DECIMAL', 'TEXTO');

-- CreateEnum
CREATE TYPE "IntervaloFacturacion" AS ENUM ('UNICO', 'DIA', 'SEMANA', 'MES', 'ANIO');

-- CreateEnum
CREATE TYPE "AlcancePrecioCatalogo" AS ENUM ('VERSION_PLAN', 'CARACTERISTICA');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('INCOMPLETA', 'EN_PRUEBA', 'ACTIVA', 'IMPAGA', 'PAUSADA', 'CANCELADA', 'EXPIRADA', 'PENDIENTE_CANCELACION');

-- CreateEnum
CREATE TYPE "TipoItemSuscripcion" AS ENUM ('PLAN_BASE', 'ADICIONAL', 'MEDIDO');

-- CreateEnum
CREATE TYPE "EstadoCuentaFacturacion" AS ENUM ('ACTIVA', 'MOROSA', 'SUSPENDIDA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('BORRADOR', 'ABIERTA', 'PAGADA', 'ANULADA', 'INCOBRABLE', 'VENCIDA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PROCESANDO', 'EXITOSO', 'FALLIDO', 'CANCELADO', 'DEVUELTO', 'DEVUELTO_PARCIALMENTE', 'REQUIERE_ACCION', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "AgregacionUso" AS ENUM ('SUMA', 'CONTEO', 'MAXIMO', 'ULTIMO', 'UNICO');

-- CreateEnum
CREATE TYPE "PeriodoUso" AS ENUM ('HORA', 'DIA', 'MES', 'PERIODO_FACTURACION');

-- CreateEnum
CREATE TYPE "EstadoIntegracion" AS ENUM ('PENDIENTE', 'ACTIVA', 'ERROR', 'DESHABILITADA');

-- CreateEnum
CREATE TYPE "EstadoIncorporacion" AS ENUM ('NO_INICIADA', 'EN_PROGRESO', 'COMPLETADA', 'BLOQUEADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoDominio" AS ENUM ('PENDIENTE', 'VERIFICADO', 'FALLIDO', 'DESHABILITADO');

-- CreateEnum
CREATE TYPE "EstadoClienteApi" AS ENUM ('ACTIVO', 'REVOCADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('PENDIENTE', 'PROCESANDO', 'PROCESADO', 'FALLIDO', 'CARTA_MUERTA');

-- CreateEnum
CREATE TYPE "EstadoEntregaWebhook" AS ENUM ('PENDIENTE', 'ENTREGANDO', 'EXITOSA', 'FALLIDA', 'CARTA_MUERTA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPermisoAcceso" AS ENUM ('PENDIENTE', 'ACTIVO', 'REVOCADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nombreVisible" TEXT NOT NULL,
    "razonSocial" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantControl" (
    "inquilinoId" UUID NOT NULL,
    "lifecycleState" "EstadoCicloVidaInquilino" NOT NULL DEFAULT 'APROVISIONANDO',
    "motivoEstado" TEXT,
    "estadoCambiadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aprovisionadoEn" TIMESTAMP(3),
    "activadoEn" TIMESTAMP(3),
    "suspendidoEn" TIMESTAMP(3),
    "eliminacionProgramadaEn" TIMESTAMP(3),
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantControl_pkey" PRIMARY KEY ("inquilinoId")
);

-- CreateTable
CREATE TABLE "TenantConfiguration" (
    "inquilinoId" UUID NOT NULL,
    "region" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "locale" TEXT,
    "dataResidencyRegion" TEXT,
    "maxUsers" INTEGER,
    "maxLocations" INTEGER,
    "maxApiClients" INTEGER,
    "maxDomains" INTEGER,
    "settings" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfiguration_pkey" PRIMARY KEY ("inquilinoId")
);

-- CreateTable
CREATE TABLE "TenantLifecyclePeriod" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "tipo" "TipoPeriodoCicloVida" NOT NULL,
    "estado" "EstadoPeriodoCicloVida" NOT NULL DEFAULT 'PROGRAMADO',
    "motivo" TEXT,
    "iniciaEn" TIMESTAMP(3) NOT NULL,
    "terminaEn" TIMESTAMP(3),
    "terminadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantLifecyclePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLifecycleTransition" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "fromState" "EstadoCicloVidaInquilino",
    "toState" "EstadoCicloVidaInquilino" NOT NULL,
    "motivo" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "correlationId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "TenantLifecycleTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "estado" "EstadoVersionPlan" NOT NULL DEFAULT 'BORRADOR',
    "vigenteDesde" TIMESTAMP(3),
    "vigenteHasta" TIMESTAMP(3),
    "trialDays" INTEGER,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "valorType" "TipoValorCaracteristica" NOT NULL DEFAULT 'BOOLEANO',
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "versionPlanId" UUID NOT NULL,
    "caracteristicaId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limitValue" DECIMAL(20,6),
    "valor" TEXT,
    "resetPeriod" "PeriodoUso",
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("versionPlanId","caracteristicaId")
);

-- CreateTable
CREATE TABLE "CatalogPrice" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "versionPlanId" UUID,
    "caracteristicaId" UUID,
    "scope" "AlcancePrecioCatalogo" NOT NULL,
    "moneda" VARCHAR(3) NOT NULL,
    "unitAmount" DECIMAL(20,6) NOT NULL,
    "interval" "IntervaloFacturacion" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "includedQuantity" DECIMAL(20,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "vigenteDesde" TIMESTAMP(3),
    "vigenteHasta" TIMESTAMP(3),
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "versionPlanId" UUID NOT NULL,
    "cuentaFacturacionId" UUID,
    "estado" "EstadoSuscripcion" NOT NULL,
    "proveedor" TEXT,
    "referenciaProveedor" TEXT,
    "iniciadoEn" TIMESTAMP(3) NOT NULL,
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStartsAt" TIMESTAMP(3),
    "currentPeriodEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelAt" TIMESTAMP(3),
    "canceladoEn" TIMESTAMP(3),
    "terminadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "suscripcionId" UUID NOT NULL,
    "priceId" UUID NOT NULL,
    "tipo" "TipoItemSuscripcion" NOT NULL,
    "cantidad" DECIMAL(20,6) NOT NULL DEFAULT 1,
    "iniciaEn" TIMESTAMP(3) NOT NULL,
    "terminaEn" TIMESTAMP(3),
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEntitlement" (
    "id" UUID NOT NULL,
    "suscripcionId" UUID NOT NULL,
    "caracteristicaId" UUID NOT NULL,
    "enabled" BOOLEAN,
    "limitValue" DECIMAL(20,6),
    "valor" TEXT,
    "resetPeriod" "PeriodoUso",
    "motivo" TEXT,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenteHasta" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccount" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "estado" "EstadoCuentaFacturacion" NOT NULL DEFAULT 'ACTIVA',
    "nombre" TEXT NOT NULL,
    "billingEmail" TEXT,
    "taxId" TEXT,
    "moneda" VARCHAR(3) NOT NULL,
    "locale" TEXT,
    "billingAddress" JSONB,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "cerradoEn" TIMESTAMP(3),

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" UUID NOT NULL,
    "cuentaFacturacionId" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referenciaProveedor" TEXT NOT NULL,
    "settings" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "cuentaFacturacionId" UUID NOT NULL,
    "suscripcionId" UUID,
    "number" TEXT NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'BORRADOR',
    "moneda" VARCHAR(3) NOT NULL,
    "subtotal" DECIMAL(20,6) NOT NULL,
    "totalDescuento" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "total" DECIMAL(20,6) NOT NULL,
    "montoDue" DECIMAL(20,6) NOT NULL,
    "montoPaid" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "periodStartsAt" TIMESTAMP(3),
    "periodEndsAt" TIMESTAMP(3),
    "emitidoEn" TIMESTAMP(3),
    "venceEn" TIMESTAMP(3),
    "pagadoEn" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "proveedor" TEXT,
    "referenciaProveedor" TEXT,
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "facturaId" UUID NOT NULL,
    "suscripcionId" UUID,
    "subscriptionItemId" UUID,
    "priceId" UUID,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(20,6) NOT NULL,
    "unitAmount" DECIMAL(20,6) NOT NULL,
    "monto" DECIMAL(20,6) NOT NULL,
    "periodStartsAt" TIMESTAMP(3),
    "periodEndsAt" TIMESTAMP(3),
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "cuentaFacturacionId" UUID NOT NULL,
    "facturaId" UUID,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "proveedor" TEXT NOT NULL,
    "referenciaProveedor" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "moneda" VARCHAR(3) NOT NULL,
    "monto" DECIMAL(20,6) NOT NULL,
    "refundedAmount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "codigoError" TEXT,
    "mensajeError" TEXT,
    "procesadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMeter" (
    "id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "caracteristicaId" UUID,
    "aggregation" "AgregacionUso" NOT NULL,
    "unit" TEXT NOT NULL,
    "period" "PeriodoUso" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageMeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "meterId" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "cantidad" DECIMAL(20,6) NOT NULL DEFAULT 1,
    "subjectId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dimensions" JSONB,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageAggregate" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "suscripcionId" UUID NOT NULL,
    "meterId" UUID NOT NULL,
    "period" "PeriodoUso" NOT NULL,
    "billingPeriodStartsAt" TIMESTAMP(3) NOT NULL,
    "billingPeriodEndsAt" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "cantidad" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "eventCount" BIGINT NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderIntegration" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "estado" "EstadoIntegracion" NOT NULL DEFAULT 'PENDIENTE',
    "externalReference" TEXT,
    "settings" JSONB,
    "ultimoError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderIntegrationSecret" (
    "id" UUID NOT NULL,
    "integrationId" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "gestorSecreto" TEXT NOT NULL,
    "referenciaSecreta" TEXT NOT NULL,
    "version" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderIntegrationSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantOnboarding" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "estado" "EstadoIncorporacion" NOT NULL DEFAULT 'NO_INICIADA',
    "currentStep" TEXT,
    "iniciadoEn" TIMESTAMP(3),
    "completadoEn" TIMESTAMP(3),
    "blockedReason" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" UUID NOT NULL,
    "incorporacionId" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "estado" "EstadoIncorporacion" NOT NULL DEFAULT 'NO_INICIADA',
    "posicion" INTEGER NOT NULL,
    "iniciadoEn" TIMESTAMP(3),
    "completadoEn" TIMESTAMP(3),
    "details" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "hostnombre" TEXT NOT NULL,
    "estado" "EstadoDominio" NOT NULL DEFAULT 'PENDIENTE',
    "verificationMethod" TEXT,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoClienteApi" NOT NULL DEFAULT 'ACTIVO',
    "scopes" TEXT[],
    "gestorSecreto" TEXT NOT NULL,
    "referenciaSecreta" TEXT NOT NULL,
    "versionSecreta" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "venceEn" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementAuditLog" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorIp" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "correlationId" TEXT,
    "motivo" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagementAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrationOutbox" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "idempotencyScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "correlationId" TEXT,
    "carga" JSONB NOT NULL,
    "encabezados" JSONB,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'PENDIENTE',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "disponibleEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadoEn" TIMESTAMP(3),
    "lockedBy" TEXT,
    "publicadoEn" TIMESTAMP(3),
    "ultimoError" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrationInbox" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID,
    "source" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "correlationId" TEXT,
    "carga" JSONB NOT NULL,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'PENDIENTE',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "disponibleEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadoEn" TIMESTAMP(3),
    "lockedBy" TEXT,
    "procesadoEn" TIMESTAMP(3),
    "ultimoError" TEXT,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrationInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "eventosSuscritos" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gestorSecreto" TEXT NOT NULL,
    "signingSecretReference" TEXT NOT NULL,
    "signingSecretVersion" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "deshabilitadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "endpointId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "carga" JSONB NOT NULL,
    "estado" "EstadoEntregaWebhook" NOT NULL DEFAULT 'PENDIENTE',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "proximoIntentoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoRespuesta" INTEGER,
    "cuerpoRespuesta" TEXT,
    "ultimoError" TEXT,
    "entregadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDeliveryAttempt" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoEn" TIMESTAMP(3),
    "estadoRespuesta" INTEGER,
    "durationMs" INTEGER,
    "error" TEXT,

    CONSTRAINT "WebhookDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAccessGrant" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "principalType" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "solicitadoPorId" TEXT,
    "aprobadoPorId" TEXT,
    "estado" "EstadoPermisoAcceso" NOT NULL DEFAULT 'PENDIENTE',
    "scopes" TEXT[],
    "motivo" TEXT NOT NULL,
    "iniciaEn" TIMESTAMP(3) NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_eliminadoEn_idx" ON "Tenant"("eliminadoEn");

-- CreateIndex
CREATE INDEX "TenantControl_lifecycleState_estadoCambiadoEn_idx" ON "TenantControl"("lifecycleState", "estadoCambiadoEn");

-- CreateIndex
CREATE INDEX "TenantControl_eliminacionProgramadaEn_idx" ON "TenantControl"("eliminacionProgramadaEn");

-- CreateIndex
CREATE INDEX "TenantConfiguration_region_idx" ON "TenantConfiguration"("region");

-- CreateIndex
CREATE INDEX "TenantLifecyclePeriod_inquilinoId_tipo_estado_idx" ON "TenantLifecyclePeriod"("inquilinoId", "tipo", "estado");

-- CreateIndex
CREATE INDEX "TenantLifecyclePeriod_estado_iniciaEn_terminaEn_idx" ON "TenantLifecyclePeriod"("estado", "iniciaEn", "terminaEn");

-- CreateIndex
CREATE INDEX "TenantLifecycleTransition_inquilinoId_occurredAt_idx" ON "TenantLifecycleTransition"("inquilinoId", "occurredAt");

-- CreateIndex
CREATE INDEX "TenantLifecycleTransition_correlationId_idx" ON "TenantLifecycleTransition"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_codigo_key" ON "Plan"("codigo");

-- CreateIndex
CREATE INDEX "PlanVersion_estado_vigenteDesde_vigenteHasta_idx" ON "PlanVersion"("estado", "vigenteDesde", "vigenteHasta");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planId_version_key" ON "PlanVersion"("planId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_clave_key" ON "Feature"("clave");

-- CreateIndex
CREATE INDEX "PlanFeature_caracteristicaId_idx" ON "PlanFeature"("caracteristicaId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogPrice_codigo_key" ON "CatalogPrice"("codigo");

-- CreateIndex
CREATE INDEX "CatalogPrice_scope_versionPlanId_isActive_idx" ON "CatalogPrice"("scope", "versionPlanId", "isActive");

-- CreateIndex
CREATE INDEX "CatalogPrice_scope_caracteristicaId_isActive_idx" ON "CatalogPrice"("scope", "caracteristicaId", "isActive");

-- CreateIndex
CREATE INDEX "Subscription_inquilinoId_estado_idx" ON "Subscription"("inquilinoId", "estado");

-- CreateIndex
CREATE INDEX "Subscription_inquilinoId_cuentaFacturacionId_idx" ON "Subscription"("inquilinoId", "cuentaFacturacionId");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEndsAt_idx" ON "Subscription"("currentPeriodEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_inquilinoId_id_key" ON "Subscription"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_inquilinoId_proveedor_referenciaProveedor_key" ON "Subscription"("inquilinoId", "proveedor", "referenciaProveedor");

-- CreateIndex
CREATE INDEX "SubscriptionItem_inquilinoId_suscripcionId_tipo_idx" ON "SubscriptionItem"("inquilinoId", "suscripcionId", "tipo");

-- CreateIndex
CREATE INDEX "SubscriptionItem_priceId_idx" ON "SubscriptionItem"("priceId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionItem_inquilinoId_suscripcionId_id_key" ON "SubscriptionItem"("inquilinoId", "suscripcionId", "id");

-- CreateIndex
CREATE INDEX "SubscriptionEntitlement_suscripcionId_caracteristicaId_vige_idx" ON "SubscriptionEntitlement"("suscripcionId", "caracteristicaId", "vigenteDesde", "vigenteHasta");

-- CreateIndex
CREATE INDEX "SubscriptionEntitlement_caracteristicaId_vigenteDesde_vigen_idx" ON "SubscriptionEntitlement"("caracteristicaId", "vigenteDesde", "vigenteHasta");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionEntitlement_suscripcionId_caracteristicaId_vige_key" ON "SubscriptionEntitlement"("suscripcionId", "caracteristicaId", "vigenteDesde");

-- CreateIndex
CREATE INDEX "BillingAccount_inquilinoId_estado_idx" ON "BillingAccount"("inquilinoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_inquilinoId_id_key" ON "BillingAccount"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_proveedor_referenciaProveedor_key" ON "BillingCustomer"("proveedor", "referenciaProveedor");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_cuentaFacturacionId_proveedor_key" ON "BillingCustomer"("cuentaFacturacionId", "proveedor");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_inquilinoId_cuentaFacturacionId_estado_venceEn_idx" ON "Invoice"("inquilinoId", "cuentaFacturacionId", "estado", "venceEn");

-- CreateIndex
CREATE INDEX "Invoice_inquilinoId_suscripcionId_periodStartsAt_idx" ON "Invoice"("inquilinoId", "suscripcionId", "periodStartsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_inquilinoId_id_key" ON "Invoice"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_inquilinoId_id_suscripcionId_key" ON "Invoice"("inquilinoId", "id", "suscripcionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_inquilinoId_proveedor_referenciaProveedor_key" ON "Invoice"("inquilinoId", "proveedor", "referenciaProveedor");

-- CreateIndex
CREATE INDEX "InvoiceItem_inquilinoId_facturaId_idx" ON "InvoiceItem"("inquilinoId", "facturaId");

-- CreateIndex
CREATE INDEX "InvoiceItem_inquilinoId_suscripcionId_subscriptionItemId_idx" ON "InvoiceItem"("inquilinoId", "suscripcionId", "subscriptionItemId");

-- CreateIndex
CREATE INDEX "Payment_inquilinoId_cuentaFacturacionId_estado_creadoEn_idx" ON "Payment"("inquilinoId", "cuentaFacturacionId", "estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Payment_inquilinoId_facturaId_idx" ON "Payment"("inquilinoId", "facturaId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_inquilinoId_proveedor_referenciaProveedor_key" ON "Payment"("inquilinoId", "proveedor", "referenciaProveedor");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_inquilinoId_proveedor_idempotencyKey_key" ON "Payment"("inquilinoId", "proveedor", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMeter_clave_key" ON "UsageMeter"("clave");

-- CreateIndex
CREATE INDEX "UsageMeter_caracteristicaId_idx" ON "UsageMeter"("caracteristicaId");

-- CreateIndex
CREATE INDEX "UsageEvent_inquilinoId_meterId_occurredAt_idx" ON "UsageEvent"("inquilinoId", "meterId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageEvent_meterId_occurredAt_idx" ON "UsageEvent"("meterId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_inquilinoId_source_idempotencyKey_key" ON "UsageEvent"("inquilinoId", "source", "idempotencyKey");

-- CreateIndex
CREATE INDEX "UsageAggregate_inquilinoId_suscripcionId_billingPeriodStart_idx" ON "UsageAggregate"("inquilinoId", "suscripcionId", "billingPeriodStartsAt", "billingPeriodEndsAt");

-- CreateIndex
CREATE INDEX "UsageAggregate_meterId_periodStart_periodEnd_idx" ON "UsageAggregate"("meterId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "UsageAggregate_inquilinoId_suscripcionId_meterId_period_bil_key" ON "UsageAggregate"("inquilinoId", "suscripcionId", "meterId", "period", "billingPeriodStartsAt", "periodStart");

-- CreateIndex
CREATE INDEX "ProviderIntegration_proveedor_estado_idx" ON "ProviderIntegration"("proveedor", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderIntegration_inquilinoId_proveedor_purpose_key" ON "ProviderIntegration"("inquilinoId", "proveedor", "purpose");

-- CreateIndex
CREATE INDEX "ProviderIntegrationSecret_gestorSecreto_referenciaSecreta_idx" ON "ProviderIntegrationSecret"("gestorSecreto", "referenciaSecreta");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderIntegrationSecret_integrationId_nombre_key" ON "ProviderIntegrationSecret"("integrationId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TenantOnboarding_inquilinoId_key" ON "TenantOnboarding"("inquilinoId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_incorporacionId_clave_key" ON "OnboardingStep"("incorporacionId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_incorporacionId_posicion_key" ON "OnboardingStep"("incorporacionId", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_hostnombre_key" ON "TenantDomain"("hostnombre");

-- CreateIndex
CREATE INDEX "TenantDomain_inquilinoId_estado_idx" ON "TenantDomain"("inquilinoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ApiClient_clientId_key" ON "ApiClient"("clientId");

-- CreateIndex
CREATE INDEX "ApiClient_inquilinoId_estado_idx" ON "ApiClient"("inquilinoId", "estado");

-- CreateIndex
CREATE INDEX "ApiClient_venceEn_idx" ON "ApiClient"("venceEn");

-- CreateIndex
CREATE INDEX "ManagementAuditLog_inquilinoId_occurredAt_idx" ON "ManagementAuditLog"("inquilinoId", "occurredAt");

-- CreateIndex
CREATE INDEX "ManagementAuditLog_entityType_entityId_occurredAt_idx" ON "ManagementAuditLog"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "ManagementAuditLog_actorId_occurredAt_idx" ON "ManagementAuditLog"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "ManagementAuditLog_correlationId_idx" ON "ManagementAuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "AdministrationOutbox_estado_disponibleEn_idx" ON "AdministrationOutbox"("estado", "disponibleEn");

-- CreateIndex
CREATE INDEX "AdministrationOutbox_aggregateType_aggregateId_creadoEn_idx" ON "AdministrationOutbox"("aggregateType", "aggregateId", "creadoEn");

-- CreateIndex
CREATE INDEX "AdministrationOutbox_inquilinoId_creadoEn_idx" ON "AdministrationOutbox"("inquilinoId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrationOutbox_source_idempotencyScope_idempotencyKey_key" ON "AdministrationOutbox"("source", "idempotencyScope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AdministrationInbox_estado_disponibleEn_idx" ON "AdministrationInbox"("estado", "disponibleEn");

-- CreateIndex
CREATE INDEX "AdministrationInbox_inquilinoId_recibidoEn_idx" ON "AdministrationInbox"("inquilinoId", "recibidoEn");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrationInbox_source_messageId_key" ON "AdministrationInbox"("source", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrationInbox_source_idempotencyKey_key" ON "AdministrationInbox"("source", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_inquilinoId_isActive_idx" ON "WebhookEndpoint"("inquilinoId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_idempotencyKey_key" ON "WebhookDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookDelivery_estado_proximoIntentoEn_idx" ON "WebhookDelivery"("estado", "proximoIntentoEn");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_creadoEn_idx" ON "WebhookDelivery"("endpointId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_endpointId_eventId_key" ON "WebhookDelivery"("endpointId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDeliveryAttempt_deliveryId_attemptNumber_key" ON "WebhookDeliveryAttempt"("deliveryId", "attemptNumber");

-- CreateIndex
CREATE INDEX "SupportAccessGrant_inquilinoId_estado_venceEn_idx" ON "SupportAccessGrant"("inquilinoId", "estado", "venceEn");

-- CreateIndex
CREATE INDEX "SupportAccessGrant_principalId_estado_venceEn_idx" ON "SupportAccessGrant"("principalId", "estado", "venceEn");

-- AddForeignKey
ALTER TABLE "TenantControl" ADD CONSTRAINT "TenantControl_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantConfiguration" ADD CONSTRAINT "TenantConfiguration_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLifecyclePeriod" ADD CONSTRAINT "TenantLifecyclePeriod_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLifecycleTransition" ADD CONSTRAINT "TenantLifecycleTransition_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_versionPlanId_fkey" FOREIGN KEY ("versionPlanId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_caracteristicaId_fkey" FOREIGN KEY ("caracteristicaId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogPrice" ADD CONSTRAINT "CatalogPrice_versionPlanId_fkey" FOREIGN KEY ("versionPlanId") REFERENCES "PlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogPrice" ADD CONSTRAINT "CatalogPrice_caracteristicaId_fkey" FOREIGN KEY ("caracteristicaId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_versionPlanId_fkey" FOREIGN KEY ("versionPlanId") REFERENCES "PlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_inquilinoId_cuentaFacturacionId_fkey" FOREIGN KEY ("inquilinoId", "cuentaFacturacionId") REFERENCES "BillingAccount"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_inquilinoId_suscripcionId_fkey" FOREIGN KEY ("inquilinoId", "suscripcionId") REFERENCES "Subscription"("inquilinoId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "CatalogPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEntitlement" ADD CONSTRAINT "SubscriptionEntitlement_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEntitlement" ADD CONSTRAINT "SubscriptionEntitlement_caracteristicaId_fkey" FOREIGN KEY ("caracteristicaId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_cuentaFacturacionId_fkey" FOREIGN KEY ("cuentaFacturacionId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_inquilinoId_cuentaFacturacionId_fkey" FOREIGN KEY ("inquilinoId", "cuentaFacturacionId") REFERENCES "BillingAccount"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_inquilinoId_suscripcionId_fkey" FOREIGN KEY ("inquilinoId", "suscripcionId") REFERENCES "Subscription"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_inquilinoId_facturaId_fkey" FOREIGN KEY ("inquilinoId", "facturaId") REFERENCES "Invoice"("inquilinoId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_inquilinoId_facturaId_suscripcionId_fkey" FOREIGN KEY ("inquilinoId", "facturaId", "suscripcionId") REFERENCES "Invoice"("inquilinoId", "id", "suscripcionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_inquilinoId_suscripcionId_fkey" FOREIGN KEY ("inquilinoId", "suscripcionId") REFERENCES "Subscription"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_inquilinoId_suscripcionId_subscriptionItemId_fkey" FOREIGN KEY ("inquilinoId", "suscripcionId", "subscriptionItemId") REFERENCES "SubscriptionItem"("inquilinoId", "suscripcionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "CatalogPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_inquilinoId_cuentaFacturacionId_fkey" FOREIGN KEY ("inquilinoId", "cuentaFacturacionId") REFERENCES "BillingAccount"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_inquilinoId_facturaId_fkey" FOREIGN KEY ("inquilinoId", "facturaId") REFERENCES "Invoice"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageMeter" ADD CONSTRAINT "UsageMeter_caracteristicaId_fkey" FOREIGN KEY ("caracteristicaId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "UsageMeter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAggregate" ADD CONSTRAINT "UsageAggregate_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAggregate" ADD CONSTRAINT "UsageAggregate_inquilinoId_suscripcionId_fkey" FOREIGN KEY ("inquilinoId", "suscripcionId") REFERENCES "Subscription"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAggregate" ADD CONSTRAINT "UsageAggregate_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "UsageMeter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderIntegration" ADD CONSTRAINT "ProviderIntegration_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderIntegrationSecret" ADD CONSTRAINT "ProviderIntegrationSecret_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "ProviderIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantOnboarding" ADD CONSTRAINT "TenantOnboarding_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_incorporacionId_fkey" FOREIGN KEY ("incorporacionId") REFERENCES "TenantOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiClient" ADD CONSTRAINT "ApiClient_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementAuditLog" ADD CONSTRAINT "ManagementAuditLog_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrationOutbox" ADD CONSTRAINT "AdministrationOutbox_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrationInbox" ADD CONSTRAINT "AdministrationInbox_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "WebhookDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
