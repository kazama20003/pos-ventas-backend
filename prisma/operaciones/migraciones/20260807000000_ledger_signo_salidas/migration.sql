-- Unifica el signo del kardex: todas las salidas quedan con cantidad negativa
-- (igual que VENTA, que ya se guardaba negada). Antes AJUSTE_SALIDA y
-- TRANSFERENCIA_SALIDA se guardaban en positivo → histórico incoherente.
-- El stock real vive en StockBalance y no se toca; esto es coherencia del
-- kardex/auditoría. Solo se negan las filas positivas para ser idempotente.
UPDATE "InventoryLedgerEntry"
SET "cantidad" = -"cantidad",
    "totalCost" = -"totalCost"
WHERE "movementType" IN ('AJUSTE_SALIDA', 'TRANSFERENCIA_SALIDA')
  AND "cantidad" > 0;
