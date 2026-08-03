-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "otrosTributos" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "montoOtrosTributos" DECIMAL(18,2) NOT NULL DEFAULT 0;
