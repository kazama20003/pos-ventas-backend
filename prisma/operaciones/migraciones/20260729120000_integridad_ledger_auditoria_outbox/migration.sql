-- Integrity controls for append-only operational records.
-- NOT VALID preserves existing historical rows while enforcing new writes.

ALTER TABLE "InventoryLedgerEntry"
  ADD CONSTRAINT "InventoryLedgerEntry_cantidad_no_cero"
  CHECK ("cantidad" <> 0) NOT VALID,
  ADD CONSTRAINT "InventoryLedgerEntry_costo_unitario_no_negativo"
  CHECK ("costoUnitario" IS NULL OR "costoUnitario" >= 0) NOT VALID,
  ADD CONSTRAINT "InventoryLedgerEntry_referencia_requerida"
  CHECK (btrim("referenciaType") <> '' AND btrim("idempotencyKey") <> '') NOT VALID;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_campos_identidad_requeridos"
  CHECK (
    btrim("entityType") <> ''
    AND btrim("entityId") <> ''
    AND btrim("action") <> ''
  ) NOT VALID;

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_campos_entrega_validos"
  CHECK (
    btrim("aggregateType") <> ''
    AND btrim("aggregateId") <> ''
    AND btrim("eventType") <> ''
    AND btrim("idempotencyKey") <> ''
    AND "intentos" >= 0
  ) NOT VALID,
  ADD CONSTRAINT "OutboxEvent_publicacion_posterior_a_ocurrencia"
  CHECK ("publicadoEn" IS NULL OR "publicadoEn" >= "occurredAt") NOT VALID;

CREATE UNIQUE INDEX "CashSession_una_abierta_por_caja"
  ON "CashSession" ("inquilinoId", "cajaId")
  WHERE "estado" IN ('ABIERTA', 'CERRANDO');

CREATE OR REPLACE FUNCTION "fn_rechazar_mutacion_inmutable"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only and cannot be modified or deleted', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION "fn_rechazar_mutacion_outbox_publicado"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."publicadoEn" IS NOT NULL THEN
    RAISE EXCEPTION 'published OutboxEvent rows cannot be modified or deleted'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "InventoryLedgerEntry_inmutable" ON "InventoryLedgerEntry";
CREATE TRIGGER "InventoryLedgerEntry_inmutable"
  BEFORE UPDATE OR DELETE ON "InventoryLedgerEntry"
  FOR EACH ROW EXECUTE FUNCTION "fn_rechazar_mutacion_inmutable"();

DROP TRIGGER IF EXISTS "AuditLog_inmutable" ON "AuditLog";
CREATE TRIGGER "AuditLog_inmutable"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "fn_rechazar_mutacion_inmutable"();

DROP TRIGGER IF EXISTS "OutboxEvent_publicado_inmutable" ON "OutboxEvent";
CREATE TRIGGER "OutboxEvent_publicado_inmutable"
  BEFORE UPDATE OR DELETE ON "OutboxEvent"
  FOR EACH ROW EXECUTE FUNCTION "fn_rechazar_mutacion_outbox_publicado"();
