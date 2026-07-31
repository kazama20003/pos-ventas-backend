-- Almacén predeterminado por sucursal (destino/origen por defecto de ventas y ops).
ALTER TABLE "Warehouse"
  ADD COLUMN "esPredeterminado" BOOLEAN NOT NULL DEFAULT false;

-- A lo sumo un almacén predeterminado por sucursal.
CREATE UNIQUE INDEX "Warehouse_predeterminado_por_sucursal"
  ON "Warehouse" ("inquilinoId", "sucursalId")
  WHERE "esPredeterminado";
