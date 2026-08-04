-- AlterTable
ALTER TABLE "CashRegister" ADD COLUMN     "almacenId" UUID;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_inquilinoId_almacenId_fkey" FOREIGN KEY ("inquilinoId", "almacenId") REFERENCES "Warehouse"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
