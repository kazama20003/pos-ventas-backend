-- Tipo de almacén (principal/tránsito/merma/devoluciones).
CREATE TYPE "TipoAlmacen" AS ENUM ('PRINCIPAL', 'TRANSITO', 'MERMA', 'DEVOLUCIONES');

ALTER TABLE "Warehouse"
  ADD COLUMN "tipo" "TipoAlmacen" NOT NULL DEFAULT 'PRINCIPAL';
