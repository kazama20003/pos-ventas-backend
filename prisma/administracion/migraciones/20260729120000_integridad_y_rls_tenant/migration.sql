-- Managed runtime contract: execute this once per tenant transaction before
-- querying tenant data: SELECT set_config('app.inquilino_id', '<tenant-uuid>', true).
-- An unset context is default-deny because current_setting(..., true) is NULL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pos_management_app') THEN
    CREATE ROLE pos_management_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO pos_management_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pos_management_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_management_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pos_management_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pos_management_app;

-- Materialize the integrity notes in the schema. New writes are checked without
-- rejecting historical data when this migration is first applied.
ALTER TABLE "CatalogPrice"
  ADD CONSTRAINT "CatalogPrice_scope_owner_exacto"
  CHECK (
    ("scope" = 'VERSION_PLAN' AND "versionPlanId" IS NOT NULL AND "caracteristicaId" IS NULL)
    OR ("scope" = 'CARACTERISTICA' AND "versionPlanId" IS NULL AND "caracteristicaId" IS NOT NULL)
  ) NOT VALID,
  ADD CONSTRAINT "CatalogPrice_montos_y_vigencia_validos"
  CHECK (
    "unitAmount" >= 0
    AND "intervalCount" > 0
    AND ("includedQuantity" IS NULL OR "includedQuantity" >= 0)
    AND ("vigenteHasta" IS NULL OR "vigenteDesde" IS NULL OR "vigenteHasta" > "vigenteDesde")
  ) NOT VALID;

ALTER TABLE "SubscriptionEntitlement"
  ADD CONSTRAINT "SubscriptionEntitlement_vigencia_positiva"
  CHECK ("vigenteHasta" IS NULL OR "vigenteHasta" > "vigenteDesde") NOT VALID;

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "SubscriptionEntitlement"
  ADD CONSTRAINT "SubscriptionEntitlement_rango_sin_solapamiento"
  EXCLUDE USING gist (
    "suscripcionId" WITH =,
    "caracteristicaId" WITH =,
    tsrange("vigenteDesde", COALESCE("vigenteHasta", 'infinity'::timestamp), '[)') WITH &&
  );

ALTER TABLE "UsageAggregate"
  ADD CONSTRAINT "UsageAggregate_rangos_positivos"
  CHECK (
    "billingPeriodEndsAt" > "billingPeriodStartsAt"
    AND "periodEnd" > "periodStart"
    AND "periodStart" >= "billingPeriodStartsAt"
    AND "periodEnd" <= "billingPeriodEndsAt"
    AND "eventCount" >= 0
  ) NOT VALID;

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_rangos_de_fecha_validos"
  CHECK (
    ("trialEndsAt" IS NULL OR "trialStartsAt" IS NULL OR "trialEndsAt" > "trialStartsAt")
    AND ("currentPeriodEndsAt" IS NULL OR "currentPeriodStartsAt" IS NULL OR "currentPeriodEndsAt" > "currentPeriodStartsAt")
  ) NOT VALID;

ALTER TABLE "SubscriptionItem"
  ADD CONSTRAINT "SubscriptionItem_cantidad_y_rango_validos"
  CHECK ("cantidad" > 0 AND ("terminaEn" IS NULL OR "terminaEn" > "iniciaEn")) NOT VALID;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_montos_y_rango_validos"
  CHECK (
    "subtotal" >= 0 AND "totalDescuento" >= 0 AND "totalImpuesto" >= 0
    AND "total" >= 0 AND "montoDue" >= 0 AND "montoPaid" >= 0
    AND "montoPaid" <= "total"
    AND ("periodEndsAt" IS NULL OR "periodStartsAt" IS NULL OR "periodEndsAt" > "periodStartsAt")
    AND ("venceEn" IS NULL OR "emitidoEn" IS NULL OR "venceEn" >= "emitidoEn")
  ) NOT VALID;

ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_suscripcion_item_pareados"
  CHECK (("suscripcionId" IS NULL) = ("subscriptionItemId" IS NULL)) NOT VALID,
  ADD CONSTRAINT "InvoiceItem_montos_y_rango_validos"
  CHECK (
    "cantidad" > 0 AND "unitAmount" >= 0 AND "monto" >= 0
    AND ("periodEndsAt" IS NULL OR "periodStartsAt" IS NULL OR "periodEndsAt" > "periodStartsAt")
  ) NOT VALID;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_montos_validos"
  CHECK ("monto" >= 0 AND "refundedAmount" >= 0 AND "refundedAmount" <= "monto") NOT VALID;

ALTER TABLE "TenantLifecyclePeriod"
  ADD CONSTRAINT "TenantLifecyclePeriod_rango_valido"
  CHECK ("terminaEn" IS NULL OR "terminaEn" > "iniciaEn") NOT VALID;

ALTER TABLE "SupportAccessGrant"
  ADD CONSTRAINT "SupportAccessGrant_rango_valido"
  CHECK ("venceEn" > "iniciaEn") NOT VALID;

-- Direct tenant rows, including nullable-tenant event tables. Global rows in
-- the latter remain inaccessible to this tenant-scoped runtime role.
DO $$
DECLARE
  tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'TenantControl', 'TenantConfiguration', 'TenantLifecyclePeriod',
    'TenantLifecycleTransition', 'Subscription', 'SubscriptionItem',
    'BillingAccount', 'Invoice', 'InvoiceItem', 'Payment', 'UsageEvent',
    'UsageAggregate', 'ProviderIntegration', 'TenantOnboarding', 'TenantDomain',
    'ApiClient', 'ManagementAuditLog', 'AdministrationOutbox',
    'AdministrationInbox', 'WebhookEndpoint', 'SupportAccessGrant'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabla);
    EXECUTE format('DROP POLICY IF EXISTS tenant_aislamiento ON %I', tabla);
    EXECUTE format(
      'CREATE POLICY tenant_aislamiento ON %I USING ("inquilinoId" = current_setting(''app.inquilino_id'', true)::uuid) WITH CHECK ("inquilinoId" = current_setting(''app.inquilino_id'', true)::uuid)',
      tabla
    );
  END LOOP;
END
$$;

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Tenant";
CREATE POLICY tenant_aislamiento ON "Tenant"
  USING ("id" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("id" = current_setting('app.inquilino_id', true)::uuid);

-- These tables inherit ownership through their tenant-scoped parent. Catalogs
-- (Plan, Feature, CatalogPrice, UsageMeter, and related global tables) have no RLS.
ALTER TABLE "SubscriptionEntitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionEntitlement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SubscriptionEntitlement";
CREATE POLICY tenant_aislamiento ON "SubscriptionEntitlement"
  USING (EXISTS (SELECT 1 FROM "Subscription" s WHERE s."id" = "suscripcionId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Subscription" s WHERE s."id" = "suscripcionId"));

ALTER TABLE "BillingCustomer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillingCustomer" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "BillingCustomer";
CREATE POLICY tenant_aislamiento ON "BillingCustomer"
  USING (EXISTS (SELECT 1 FROM "BillingAccount" b WHERE b."id" = "cuentaFacturacionId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "BillingAccount" b WHERE b."id" = "cuentaFacturacionId"));

ALTER TABLE "ProviderIntegrationSecret" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderIntegrationSecret" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ProviderIntegrationSecret";
CREATE POLICY tenant_aislamiento ON "ProviderIntegrationSecret"
  USING (EXISTS (SELECT 1 FROM "ProviderIntegration" p WHERE p."id" = "integrationId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "ProviderIntegration" p WHERE p."id" = "integrationId"));

ALTER TABLE "OnboardingStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingStep" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "OnboardingStep";
CREATE POLICY tenant_aislamiento ON "OnboardingStep"
  USING (EXISTS (SELECT 1 FROM "TenantOnboarding" o WHERE o."id" = "incorporacionId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "TenantOnboarding" o WHERE o."id" = "incorporacionId"));

ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "WebhookDelivery";
CREATE POLICY tenant_aislamiento ON "WebhookDelivery"
  USING (EXISTS (SELECT 1 FROM "WebhookEndpoint" e WHERE e."id" = "endpointId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "WebhookEndpoint" e WHERE e."id" = "endpointId"));

ALTER TABLE "WebhookDeliveryAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDeliveryAttempt" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "WebhookDeliveryAttempt";
CREATE POLICY tenant_aislamiento ON "WebhookDeliveryAttempt"
  USING (EXISTS (SELECT 1 FROM "WebhookDelivery" d WHERE d."id" = "deliveryId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "WebhookDelivery" d WHERE d."id" = "deliveryId"));
