-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "proveedorId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "supplierSku" TEXT,
    "costo" DECIMAL(18,6) NOT NULL,
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "minOrderQty" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierProduct_inquilinoId_varianteId_isPreferred_idx" ON "SupplierProduct"("inquilinoId", "varianteId", "isPreferred");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_inquilinoId_proveedorId_varianteId_key" ON "SupplierProduct"("inquilinoId", "proveedorId", "varianteId");

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
