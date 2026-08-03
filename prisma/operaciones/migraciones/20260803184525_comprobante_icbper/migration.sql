-- AlterTable
ALTER TABLE "ElectronicDocument" ADD COLUMN     "otrosTributos" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ElectronicDocumentItem" ADD COLUMN     "montoOtrosTributos" DECIMAL(18,2) NOT NULL DEFAULT 0;
