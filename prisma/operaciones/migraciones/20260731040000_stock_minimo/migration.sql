-- Niveles de reabastecimiento por almacén+variante.
ALTER TABLE "StockBalance"
  ADD COLUMN "stockMinimo" DECIMAL(18, 6) NOT NULL DEFAULT 0,
  ADD COLUMN "stockMaximo" DECIMAL(18, 6) NOT NULL DEFAULT 0;

-- Acelera la consulta de alertas (bajo mínimo).
CREATE INDEX "StockBalance_bajo_minimo"
  ON "StockBalance" ("inquilinoId", "almacenId")
  WHERE "stockMinimo" > 0;
