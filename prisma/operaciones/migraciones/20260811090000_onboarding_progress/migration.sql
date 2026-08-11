-- Progreso granular del onboarding contextual (tenant + usuario opcional +
-- flujo + paso). La completitud real se deriva de datos; aquí van overrides
-- del usuario (omitido/descartado) y metadata.
CREATE TYPE "EstadoPasoOnboarding" AS ENUM ('PENDIENTE', 'COMPLETADO', 'OMITIDO', 'DESCARTADO');

CREATE TABLE "OnboardingProgress" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "userId" UUID,
    "flowKey" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" "EstadoPasoOnboarding" NOT NULL DEFAULT 'PENDIENTE',
    "completadoEn" TIMESTAMP(3),
    "descartadoEn" TIMESTAMP(3),
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingProgress_inquilinoId_userId_flowKey_stepKey_key" ON "OnboardingProgress"("inquilinoId", "userId", "flowKey", "stepKey");
CREATE INDEX "OnboardingProgress_inquilinoId_flowKey_idx" ON "OnboardingProgress"("inquilinoId", "flowKey");

ALTER TABLE "OnboardingProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingProgress" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "OnboardingProgress";
CREATE POLICY tenant_aislamiento ON "OnboardingProgress"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);
