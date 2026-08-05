-- CreateTable
CREATE TABLE "CajaOperador" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "identidadUsuarioId" UUID NOT NULL,
    "cajaId" UUID NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CajaOperador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CajaOperador_inquilinoId_cajaId_idx" ON "CajaOperador"("inquilinoId", "cajaId");

-- CreateIndex
CREATE INDEX "CajaOperador_inquilinoId_identidadUsuarioId_idx" ON "CajaOperador"("inquilinoId", "identidadUsuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "CajaOperador_inquilinoId_identidadUsuarioId_cajaId_key" ON "CajaOperador"("inquilinoId", "identidadUsuarioId", "cajaId");

-- CreateIndex
CREATE UNIQUE INDEX "CashRegister_inquilinoId_id_key" ON "CashRegister"("inquilinoId", "id");

-- AddForeignKey
ALTER TABLE "CajaOperador" ADD CONSTRAINT "CajaOperador_inquilinoId_identidadUsuarioId_fkey" FOREIGN KEY ("inquilinoId", "identidadUsuarioId") REFERENCES "UserIdentity"("inquilinoId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaOperador" ADD CONSTRAINT "CajaOperador_inquilinoId_cajaId_fkey" FOREIGN KEY ("inquilinoId", "cajaId") REFERENCES "CashRegister"("inquilinoId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: los usuarios que ya abrieron una caja quedan asignados a ella.
INSERT INTO "CajaOperador" ("id", "inquilinoId", "identidadUsuarioId", "cajaId")
SELECT gen_random_uuid(), "inquilinoId", "abiertoPorId", "cajaId"
FROM (
  SELECT DISTINCT "inquilinoId", "abiertoPorId", "cajaId"
  FROM "CashSession"
) s;
