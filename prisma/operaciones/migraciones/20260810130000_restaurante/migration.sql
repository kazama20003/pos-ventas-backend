-- Módulo restaurante: mesas, comandas, líneas con estado de cocina (KDS) y
-- modificadores. Mismas convenciones (RLS por tenant, signos, snapshots) que
-- el resto del schema operaciones.

CREATE TYPE "EstadoMesa" AS ENUM ('LIBRE', 'OCUPADA', 'CUENTA', 'RESERVADA', 'INACTIVA');
CREATE TYPE "TipoComanda" AS ENUM ('MESA', 'LLEVAR', 'DELIVERY');
CREATE TYPE "EstadoComanda" AS ENUM ('ABIERTA', 'EN_COCINA', 'SERVIDA', 'POR_PAGAR', 'CERRADA', 'CANCELADA');
CREATE TYPE "EstadoCocinaItem" AS ENUM ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO');
CREATE TYPE "EstacionCocina" AS ENUM ('COCINA', 'BARRA', 'OTRO');

CREATE TABLE "RestaurantTable" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "zona" TEXT,
    "capacidad" INTEGER NOT NULL DEFAULT 2,
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoMesa" NOT NULL DEFAULT 'LIBRE',
    "estadoRegistro" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RestaurantTable_inquilinoId_sucursalId_codigo_key" ON "RestaurantTable"("inquilinoId", "sucursalId", "codigo");
CREATE INDEX "RestaurantTable_inquilinoId_sucursalId_estado_idx" ON "RestaurantTable"("inquilinoId", "sucursalId", "estado");

CREATE TABLE "DiningOrder" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "mesaId" UUID,
    "tipo" "TipoComanda" NOT NULL DEFAULT 'MESA',
    "estado" "EstadoComanda" NOT NULL DEFAULT 'ABIERTA',
    "mozoId" UUID,
    "comensales" INTEGER NOT NULL DEFAULT 1,
    "notas" TEXT,
    "propina" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ventaId" UUID,
    "aperturaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cierreEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiningOrder_inquilinoId_sucursalId_estado_idx" ON "DiningOrder"("inquilinoId", "sucursalId", "estado");
CREATE INDEX "DiningOrder_inquilinoId_mesaId_idx" ON "DiningOrder"("inquilinoId", "mesaId");

CREATE TABLE "DiningOrderItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "comandaId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "precioUnitario" DECIMAL(18,2) NOT NULL,
    "notas" TEXT,
    "estacion" "EstacionCocina" NOT NULL DEFAULT 'COCINA',
    "estadoCocina" "EstadoCocinaItem" NOT NULL DEFAULT 'PENDIENTE',
    "enviadoEn" TIMESTAMP(3),
    "listoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiningOrderItem_inquilinoId_comandaId_idx" ON "DiningOrderItem"("inquilinoId", "comandaId");
CREATE INDEX "DiningOrderItem_inquilinoId_estadoCocina_estacion_idx" ON "DiningOrderItem"("inquilinoId", "estadoCocina", "estacion");

CREATE TABLE "DiningOrderItemModifier" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioExtra" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiningOrderItemModifier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiningOrderItemModifier_inquilinoId_itemId_idx" ON "DiningOrderItemModifier"("inquilinoId", "itemId");

-- Foreign keys
ALTER TABLE "DiningOrder" ADD CONSTRAINT "DiningOrder_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiningOrderItem" ADD CONSTRAINT "DiningOrderItem_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "DiningOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiningOrderItemModifier" ADD CONSTRAINT "DiningOrderItemModifier_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "DiningOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS por tenant (patrón estándar del schema).
ALTER TABLE "RestaurantTable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantTable" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "RestaurantTable";
CREATE POLICY tenant_aislamiento ON "RestaurantTable"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "DiningOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiningOrder" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "DiningOrder";
CREATE POLICY tenant_aislamiento ON "DiningOrder"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "DiningOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiningOrderItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "DiningOrderItem";
CREATE POLICY tenant_aislamiento ON "DiningOrderItem"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);

ALTER TABLE "DiningOrderItemModifier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiningOrderItemModifier" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_aislamiento ON "DiningOrderItemModifier";
CREATE POLICY tenant_aislamiento ON "DiningOrderItemModifier"
  USING ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid)
  WITH CHECK ("inquilinoId" = current_setting('app.inquilino_id', true)::uuid);
