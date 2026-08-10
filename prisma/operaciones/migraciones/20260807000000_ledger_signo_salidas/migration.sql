-- Unifica el signo del kardex: todas las salidas quedan con cantidad negativa
-- (igual que VENTA, que ya se guardaba negada). Antes AJUSTE_SALIDA y
-- TRANSFERENCIA_SALIDA se guardaban en positivo → histórico incoherente.
-- El stock real vive en StockBalance y no se toca; esto es coherencia del
-- kardex/auditoría. Solo se negan las filas positivas para ser idempotente.
--
-- InventoryLedgerEntry es append-only (trigger InventoryLedgerEntry_inmutable
-- rechaza UPDATE/DELETE). Este data-fix histórico es la única excepción
-- autorizada, así que se desactiva el trigger solo durante el UPDATE y se
-- reactiva de inmediato dentro de la misma transacción de la migración.
ALTER TABLE "InventoryLedgerEntry" DISABLE TRIGGER "InventoryLedgerEntry_inmutable";

UPDATE "InventoryLedgerEntry"
SET "cantidad" = -"cantidad",
    "totalCost" = -"totalCost"
WHERE "movementType" IN ('AJUSTE_SALIDA', 'TRANSFERENCIA_SALIDA')
  AND "cantidad" > 0;

ALTER TABLE "InventoryLedgerEntry" ENABLE TRIGGER "InventoryLedgerEntry_inmutable";
