-- Enforce tenant-composite FKs on the sales document cluster.
-- Drop single-key FKs, add [inquilinoId, id] composite FKs matching the
-- pattern already used by Sale/InventoryLedgerEntry, and add the
-- [inquilinoId, id] unique keys required to target Quotation/SalesOrder.

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_sucursalId_fkey";
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_clienteId_fkey";
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_sucursalId_fkey";
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_clienteId_fkey";
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_cotizacionId_fkey";
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_cotizacionId_fkey";
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_pedidoVentaId_fkey";
ALTER TABLE "DocumentSeries" DROP CONSTRAINT "DocumentSeries_empresaId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_inquilinoId_id_key" ON "Quotation"("inquilinoId", "id");
CREATE UNIQUE INDEX "SalesOrder_inquilinoId_id_key" ON "SalesOrder"("inquilinoId", "id");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_inquilinoId_sucursalId_fkey" FOREIGN KEY ("inquilinoId", "sucursalId") REFERENCES "Branch"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_inquilinoId_clienteId_fkey" FOREIGN KEY ("inquilinoId", "clienteId") REFERENCES "Customer"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_inquilinoId_sucursalId_fkey" FOREIGN KEY ("inquilinoId", "sucursalId") REFERENCES "Branch"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_inquilinoId_clienteId_fkey" FOREIGN KEY ("inquilinoId", "clienteId") REFERENCES "Customer"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_inquilinoId_cotizacionId_fkey" FOREIGN KEY ("inquilinoId", "cotizacionId") REFERENCES "Quotation"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_cotizacionId_fkey" FOREIGN KEY ("inquilinoId", "cotizacionId") REFERENCES "Quotation"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_pedidoVentaId_fkey" FOREIGN KEY ("inquilinoId", "pedidoVentaId") REFERENCES "SalesOrder"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentSeries" ADD CONSTRAINT "DocumentSeries_inquilinoId_empresaId_fkey" FOREIGN KEY ("inquilinoId", "empresaId") REFERENCES "Company"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
