-- Estado del onboarding guiado por inquilino. Una fila por tenant (creada al
-- registrar la empresa) para que la guía de primera venta aparezca desde el
-- inicio. El progreso por paso se deriva de datos reales; aquí solo se guarda
-- si el usuario la descartó y cuándo la completó.
CREATE TABLE "OnboardingState" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "descartado" BOOLEAN NOT NULL DEFAULT false,
    "completadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingState_inquilinoId_key" ON "OnboardingState"("inquilinoId");
CREATE INDEX "OnboardingState_inquilinoId_idx" ON "OnboardingState"("inquilinoId");

-- Aislamiento por tenant (mismo patrón que el resto de tablas).
ALTER TABLE "OnboardingState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingState" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "OnboardingState";
CREATE POLICY tenant_aislamiento ON "OnboardingState"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);
