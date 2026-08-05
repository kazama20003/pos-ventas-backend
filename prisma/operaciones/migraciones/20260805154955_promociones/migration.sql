-- CreateEnum
CREATE TYPE "TipoBeneficioPromocion" AS ENUM ('PORCENTAJE', 'MONTO_FIJO', 'PRECIO_FIJO', 'LLEVA_N_PAGA_M');

-- CreateEnum
CREATE TYPE "AlcancePromocion" AS ENUM ('PRODUCTO', 'CATEGORIA', 'MARCA', 'VENTA');

-- CreateEnum
CREATE TYPE "EstadoPromocion" AS ENUM ('PROGRAMADA', 'ACTIVA', 'PAUSADA', 'EXPIRADA');

-- AlterTable
ALTER TABLE "SaleDiscount" ADD COLUMN     "promocionId" UUID;

-- AlterTable
ALTER TABLE "SaleItemDiscount" ADD COLUMN     "promocionId" UUID;

-- CreateTable
CREATE TABLE "Promotion" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoBeneficio" "TipoBeneficioPromocion" NOT NULL,
    "valor" DECIMAL(18,6),
    "compraCantidad" INTEGER,
    "pagaCantidad" INTEGER,
    "iniciaEn" TIMESTAMP(3) NOT NULL,
    "terminaEn" TIMESTAMP(3),
    "estado" "EstadoPromocion" NOT NULL DEFAULT 'PROGRAMADA',
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "acumulable" BOOLEAN NOT NULL DEFAULT false,
    "cantidadMinima" DECIMAL(18,6),
    "montoMinimoVenta" DECIMAL(18,2),
    "usoMaximo" INTEGER,
    "usoActual" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionScope" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "promocionId" UUID NOT NULL,
    "alcance" "AlcancePromocion" NOT NULL,
    "referenciaId" UUID,

    CONSTRAINT "PromotionScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_inquilinoId_empresaId_estado_iniciaEn_terminaEn_idx" ON "Promotion"("inquilinoId", "empresaId", "estado", "iniciaEn", "terminaEn");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_inquilinoId_empresaId_codigo_key" ON "Promotion"("inquilinoId", "empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_inquilinoId_id_key" ON "Promotion"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "PromotionScope_inquilinoId_promocionId_idx" ON "PromotionScope"("inquilinoId", "promocionId");

-- CreateIndex
CREATE INDEX "PromotionScope_inquilinoId_alcance_referenciaId_idx" ON "PromotionScope"("inquilinoId", "alcance", "referenciaId");

-- CreateIndex
CREATE INDEX "SaleDiscount_inquilinoId_promocionId_idx" ON "SaleDiscount"("inquilinoId", "promocionId");

-- CreateIndex
CREATE INDEX "SaleItemDiscount_inquilinoId_promocionId_idx" ON "SaleItemDiscount"("inquilinoId", "promocionId");

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_inquilinoId_promocionId_fkey" FOREIGN KEY ("inquilinoId", "promocionId") REFERENCES "Promotion"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemDiscount" ADD CONSTRAINT "SaleItemDiscount_inquilinoId_promocionId_fkey" FOREIGN KEY ("inquilinoId", "promocionId") REFERENCES "Promotion"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_inquilinoId_empresaId_fkey" FOREIGN KEY ("inquilinoId", "empresaId") REFERENCES "Company"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionScope" ADD CONSTRAINT "PromotionScope_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
