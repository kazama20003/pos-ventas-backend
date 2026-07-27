-- Row Level Security: tenant isolation enforced at the database.
-- Policies key off current_setting('app.inquilino_id'); when unset the
-- comparison yields NULL and no rows are visible (default deny).
-- Activation is operational: point the runtime connection at role "pos_app"
-- (a non-superuser). The migration runs as the DB owner/superuser, which
-- bypasses RLS, so applying this migration cannot lock out migrations.

-- Application role (NOLOGIN; ops grants LOGIN + password out of band).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pos_app') THEN
    CREATE ROLE pos_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO pos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pos_app;

ALTER TABLE "AccessPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccessPolicy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "AccessPolicy";
CREATE POLICY tenant_aislamiento ON "AccessPolicy"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "AccountsPayable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountsPayable" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "AccountsPayable";
CREATE POLICY tenant_aislamiento ON "AccountsPayable"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "AccountsReceivable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountsReceivable" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "AccountsReceivable";
CREATE POLICY tenant_aislamiento ON "AccountsReceivable"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "AuditLog";
CREATE POLICY tenant_aislamiento ON "AuditLog"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Branch";
CREATE POLICY tenant_aislamiento ON "Branch"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Brand";
CREATE POLICY tenant_aislamiento ON "Brand"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "CashCount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashCount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "CashCount";
CREATE POLICY tenant_aislamiento ON "CashCount"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "CashMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashMovement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "CashMovement";
CREATE POLICY tenant_aislamiento ON "CashMovement"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "CashReconciliation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashReconciliation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "CashReconciliation";
CREATE POLICY tenant_aislamiento ON "CashReconciliation"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "CashRegister" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashRegister" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "CashRegister";
CREATE POLICY tenant_aislamiento ON "CashRegister"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "CashSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashSession" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "CashSession";
CREATE POLICY tenant_aislamiento ON "CashSession"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Category";
CREATE POLICY tenant_aislamiento ON "Category"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Company";
CREATE POLICY tenant_aislamiento ON "Company"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Customer";
CREATE POLICY tenant_aislamiento ON "Customer"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "CustomerAddress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerAddress" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "CustomerAddress";
CREATE POLICY tenant_aislamiento ON "CustomerAddress"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "CustomerCreditAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerCreditAccount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "CustomerCreditAccount";
CREATE POLICY tenant_aislamiento ON "CustomerCreditAccount"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "DocumentSeries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentSeries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "DocumentSeries";
CREATE POLICY tenant_aislamiento ON "DocumentSeries"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ElectronicDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElectronicDocument" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ElectronicDocument";
CREATE POLICY tenant_aislamiento ON "ElectronicDocument"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ElectronicDocumentCreditInstallment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElectronicDocumentCreditInstallment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ElectronicDocumentCreditInstallment";
CREATE POLICY tenant_aislamiento ON "ElectronicDocumentCreditInstallment"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ElectronicDocumentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElectronicDocumentEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ElectronicDocumentEvent";
CREATE POLICY tenant_aislamiento ON "ElectronicDocumentEvent"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ElectronicDocumentItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElectronicDocumentItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ElectronicDocumentItem";
CREATE POLICY tenant_aislamiento ON "ElectronicDocumentItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ElectronicDocumentLegend" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElectronicDocumentLegend" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ElectronicDocumentLegend";
CREATE POLICY tenant_aislamiento ON "ElectronicDocumentLegend"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "FileObject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileObject" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "FileObject";
CREATE POLICY tenant_aislamiento ON "FileObject"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventoryCount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryCount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventoryCount";
CREATE POLICY tenant_aislamiento ON "InventoryCount"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventoryCountItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryCountItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventoryCountItem";
CREATE POLICY tenant_aislamiento ON "InventoryCountItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventoryLedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryLedgerEntry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventoryLedgerEntry";
CREATE POLICY tenant_aislamiento ON "InventoryLedgerEntry"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventoryLot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryLot" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventoryLot";
CREATE POLICY tenant_aislamiento ON "InventoryLot"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventoryReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryReservation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventoryReservation";
CREATE POLICY tenant_aislamiento ON "InventoryReservation"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventorySerial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventorySerial" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventorySerial";
CREATE POLICY tenant_aislamiento ON "InventorySerial"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventoryTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransfer" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventoryTransfer";
CREATE POLICY tenant_aislamiento ON "InventoryTransfer"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "InventoryTransferItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransferItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "InventoryTransferItem";
CREATE POLICY tenant_aislamiento ON "InventoryTransferItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Membership";
CREATE POLICY tenant_aislamiento ON "Membership"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "MembershipLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipLimit" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "MembershipLimit";
CREATE POLICY tenant_aislamiento ON "MembershipLimit"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "MembershipRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipRole" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "MembershipRole";
CREATE POLICY tenant_aislamiento ON "MembershipRole"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Notification";
CREATE POLICY tenant_aislamiento ON "Notification"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Organization";
CREATE POLICY tenant_aislamiento ON "Organization"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "OutboxEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutboxEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "OutboxEvent";
CREATE POLICY tenant_aislamiento ON "OutboxEvent"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PayableInstallment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayableInstallment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PayableInstallment";
CREATE POLICY tenant_aislamiento ON "PayableInstallment"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PayablePaymentAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayablePaymentAllocation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PayablePaymentAllocation";
CREATE POLICY tenant_aislamiento ON "PayablePaymentAllocation"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PaymentIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentIntent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PaymentIntent";
CREATE POLICY tenant_aislamiento ON "PaymentIntent"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PaymentProviderAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentProviderAccount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PaymentProviderAccount";
CREATE POLICY tenant_aislamiento ON "PaymentProviderAccount"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PaymentRefund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentRefund" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PaymentRefund";
CREATE POLICY tenant_aislamiento ON "PaymentRefund"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PaymentSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSettlement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PaymentSettlement";
CREATE POLICY tenant_aislamiento ON "PaymentSettlement"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PaymentSettlementItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSettlementItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PaymentSettlementItem";
CREATE POLICY tenant_aislamiento ON "PaymentSettlementItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PaymentTransaction";
CREATE POLICY tenant_aislamiento ON "PaymentTransaction"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PaymentWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentWebhookEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PaymentWebhookEvent";
CREATE POLICY tenant_aislamiento ON "PaymentWebhookEvent"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PriceList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceList" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PriceList";
CREATE POLICY tenant_aislamiento ON "PriceList"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PriceListItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceListItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PriceListItem";
CREATE POLICY tenant_aislamiento ON "PriceListItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Product";
CREATE POLICY tenant_aislamiento ON "Product"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ProductBarcodigo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductBarcodigo" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ProductBarcodigo";
CREATE POLICY tenant_aislamiento ON "ProductBarcodigo"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ProductBundleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductBundleItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ProductBundleItem";
CREATE POLICY tenant_aislamiento ON "ProductBundleItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ProductCategory";
CREATE POLICY tenant_aislamiento ON "ProductCategory"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ProductImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductImage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ProductImage";
CREATE POLICY tenant_aislamiento ON "ProductImage"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ProductVariant";
CREATE POLICY tenant_aislamiento ON "ProductVariant"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ProductVariantTax" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariantTax" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ProductVariantTax";
CREATE POLICY tenant_aislamiento ON "ProductVariantTax"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PurchaseOrder";
CREATE POLICY tenant_aislamiento ON "PurchaseOrder"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PurchaseOrderItem";
CREATE POLICY tenant_aislamiento ON "PurchaseOrderItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PurchasePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchasePayment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PurchasePayment";
CREATE POLICY tenant_aislamiento ON "PurchasePayment"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PurchaseReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseReceipt" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PurchaseReceipt";
CREATE POLICY tenant_aislamiento ON "PurchaseReceipt"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "PurchaseReceiptItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseReceiptItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "PurchaseReceiptItem";
CREATE POLICY tenant_aislamiento ON "PurchaseReceiptItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Quotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quotation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Quotation";
CREATE POLICY tenant_aislamiento ON "Quotation"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "QuotationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuotationItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "QuotationItem";
CREATE POLICY tenant_aislamiento ON "QuotationItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ReceivableInstallment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReceivableInstallment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ReceivableInstallment";
CREATE POLICY tenant_aislamiento ON "ReceivableInstallment"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ReceivablePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReceivablePayment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ReceivablePayment";
CREATE POLICY tenant_aislamiento ON "ReceivablePayment"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "ReceivablePaymentAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReceivablePaymentAllocation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "ReceivablePaymentAllocation";
CREATE POLICY tenant_aislamiento ON "ReceivablePaymentAllocation"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Role";
CREATE POLICY tenant_aislamiento ON "Role"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "RolePermission";
CREATE POLICY tenant_aislamiento ON "RolePermission"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Sale";
CREATE POLICY tenant_aislamiento ON "Sale"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleDiscount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleDiscount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleDiscount";
CREATE POLICY tenant_aislamiento ON "SaleDiscount"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleItem";
CREATE POLICY tenant_aislamiento ON "SaleItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleItemDiscount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItemDiscount" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleItemDiscount";
CREATE POLICY tenant_aislamiento ON "SaleItemDiscount"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleItemTax" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItemTax" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleItemTax";
CREATE POLICY tenant_aislamiento ON "SaleItemTax"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SalePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalePayment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SalePayment";
CREATE POLICY tenant_aislamiento ON "SalePayment"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleReference" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleReference";
CREATE POLICY tenant_aislamiento ON "SaleReference"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleRefund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleRefund" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleRefund";
CREATE POLICY tenant_aislamiento ON "SaleRefund"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleRefundItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleRefundItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleRefundItem";
CREATE POLICY tenant_aislamiento ON "SaleRefundItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SaleTax" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleTax" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SaleTax";
CREATE POLICY tenant_aislamiento ON "SaleTax"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SalesOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrder" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SalesOrder";
CREATE POLICY tenant_aislamiento ON "SalesOrder"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SalesOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrderItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SalesOrderItem";
CREATE POLICY tenant_aislamiento ON "SalesOrderItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "StockBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockBalance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "StockBalance";
CREATE POLICY tenant_aislamiento ON "StockBalance"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "SunatCertificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SunatCertificate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "SunatCertificate";
CREATE POLICY tenant_aislamiento ON "SunatCertificate"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Supplier";
CREATE POLICY tenant_aislamiento ON "Supplier"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Tax" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tax" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Tax";
CREATE POLICY tenant_aislamiento ON "Tax"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Terminal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Terminal" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Terminal";
CREATE POLICY tenant_aislamiento ON "Terminal"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "UnitOfMeasure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UnitOfMeasure" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "UnitOfMeasure";
CREATE POLICY tenant_aislamiento ON "UnitOfMeasure"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "UserIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserIdentity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "UserIdentity";
CREATE POLICY tenant_aislamiento ON "UserIdentity"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "Warehouse";
CREATE POLICY tenant_aislamiento ON "Warehouse"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "WebhookDelivery";
CREATE POLICY tenant_aislamiento ON "WebhookDelivery"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "WebhookEndpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEndpoint" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "WebhookEndpoint";
CREATE POLICY tenant_aislamiento ON "WebhookEndpoint"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

