-- CreateEnum
CREATE TYPE "EstadoRegistro" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'ARCHIVADO', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "EstadoMembresia" AS ENUM ('INVITADA', 'PENDIENTE_APROBACION', 'ACTIVA', 'SUSPENDIDA', 'REVOCADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "EfectoPolitica" AS ENUM ('PERMITIR', 'DENEGAR');

-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('ESTANDAR', 'SERVICIO', 'PAQUETE');

-- CreateEnum
CREATE TYPE "TipoCodigoBarras" AS ENUM ('EAN13', 'EAN8', 'UPC_A', 'CODIGO128', 'QR', 'PLU', 'INTERNO');

-- CreateEnum
CREATE TYPE "AfectacionImpuesto" AS ENUM ('GRAVADO', 'EXONERADO', 'INAFECTO', 'GRATUITO', 'EXPORTACION');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('APERTURA', 'RECEPCION_COMPRA', 'DEVOLUCION_COMPRA', 'VENTA', 'DEVOLUCION_VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA', 'GANANCIA_CONTEO', 'PERDIDA_CONTEO', 'PRODUCCION_ENTRADA', 'PRODUCCION_SALIDA');

-- CreateEnum
CREATE TYPE "EstadoReservaInventario" AS ENUM ('ACTIVA', 'PARCIALMENTE_ATENDIDA', 'ATENDIDA', 'LIBERADA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoTransferenciaInventario" AS ENUM ('BORRADOR', 'SOLICITADA', 'APROBADA', 'EN_TRANSITO', 'RECIBIDA_PARCIALMENTE', 'RECIBIDA', 'CANCELADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoConteoInventario" AS ENUM ('BORRADOR', 'EN_PROGRESO', 'ENVIADO', 'APROBADO', 'CONTABILIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoSerieInventario" AS ENUM ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'EN_TRANSITO', 'DEVUELTA', 'DANADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('PERSONA', 'EMPRESA');

-- CreateEnum
CREATE TYPE "TipoDocumentoIdentidad" AS ENUM ('DNI', 'RUC', 'CE', 'PASAPORTE', 'ID_TRIBUTARIO_EXTRANJERO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCuentaCredito" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'CERRADA', 'BLOQUEADA');

-- CreateEnum
CREATE TYPE "EstadoDocumentoComercial" AS ENUM ('BORRADOR', 'CONFIRMADO', 'PARCIALMENTE_ATENDIDO', 'ATENDIDO', 'VENCIDO', 'CANCELADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('BORRADOR', 'PENDIENTE_PAGO', 'PAGADA_PARCIALMENTE', 'PAGADA', 'COMPLETADA', 'ANULADA', 'DEVUELTA_PARCIALMENTE', 'DEVUELTA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA_BANCARIA', 'BILLETERA_DIGITAL', 'CREDITO_TIENDA', 'CREDITO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoIntentoPago" AS ENUM ('CREADO', 'REQUIERE_ACCION', 'PROCESANDO', 'EXITOSO', 'DEVUELTO_PARCIALMENTE', 'DEVUELTO', 'CANCELADO', 'FALLIDO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "EstadoTransaccionPago" AS ENUM ('PENDIENTE', 'AUTORIZADA', 'CAPTURADA', 'LIQUIDADA', 'ANULADA', 'FALLIDA', 'REVERSADA');

-- CreateEnum
CREATE TYPE "EstadoDevolucionPago" AS ENUM ('PENDIENTE', 'PROCESANDO', 'EXITOSA', 'FALLIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('PENDIENTE', 'EN_TRANSITO', 'PAGADA', 'FALLIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoDevolucionVenta" AS ENUM ('BORRADOR', 'PENDIENTE', 'APROBADA', 'COMPLETADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoSesionCaja" AS ENUM ('ABIERTA', 'CERRANDO', 'CERRADA', 'CONCILIADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('FONDO_APERTURA', 'VENTA_EFECTIVO', 'DEVOLUCION_EFECTIVO', 'INGRESO_EFECTIVO', 'EGRESO_EFECTIVO', 'RETIRO', 'AJUSTE_CIERRE');

-- CreateEnum
CREATE TYPE "TipoDocumentoElectronico" AS ENUM ('FACTURA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO');

-- CreateEnum
CREATE TYPE "TerminosPagoFiscal" AS ENUM ('CONTADO', 'CREDITO');

-- CreateEnum
CREATE TYPE "EstadoDocumentoElectronico" AS ENUM ('BORRADOR', 'EN_COLA', 'FIRMADO', 'ENVIADO', 'ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES', 'RECHAZADO', 'BAJA_SOLICITADA', 'ANULADO', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'APROBADA', 'RECIBIDA_PARCIALMENTE', 'RECIBIDA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoRecepcionCompra" AS ENUM ('BORRADOR', 'CONTABILIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoCuentaPorCobrarPagar" AS ENUM ('PENDIENTE', 'PAGADA_PARCIALMENTE', 'PAGADA', 'VENCIDA', 'CANCELADA', 'CASTIGADA');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIADA', 'LEIDA', 'FALLIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoEntregaWebhook" AS ENUM ('PENDIENTE', 'ENTREGANDO', 'EXITOSA', 'FALLIDA', 'AGOTADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "idiomaPredeterminado" TEXT NOT NULL DEFAULT 'es-PE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "organizacionId" UUID NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "ruc" VARCHAR(11) NOT NULL,
    "sunatUbigeo" VARCHAR(6),
    "fiscalAddress" TEXT,
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sunatUbigeo" VARCHAR(6),
    "address" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "address" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Terminal" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "cajaId" UUID,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveDispositivo" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "ultimoVistoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sujetoExterno" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombreVisible" TEXT NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "ultimoIngresoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "organizacionId" UUID NOT NULL,
    "identidadUsuarioId" UUID NOT NULL,
    "estado" "EstadoMembresia" NOT NULL DEFAULT 'INVITADA',
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenteHasta" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "inquilinoId" UUID NOT NULL,
    "rolId" UUID NOT NULL,
    "permisoId" UUID NOT NULL,
    "effect" "EfectoPolitica" NOT NULL DEFAULT 'PERMITIR',
    "constraints" JSONB,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateTable
CREATE TABLE "MembershipRole" (
    "inquilinoId" UUID NOT NULL,
    "membresiaId" UUID NOT NULL,
    "rolId" UUID NOT NULL,
    "sucursalId" UUID,
    "vigenteHasta" TIMESTAMP(3),

    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("membresiaId","rolId")
);

-- CreateTable
CREATE TABLE "AccessPolicy" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "membresiaId" UUID NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" "EfectoPolitica" NOT NULL,
    "sucursalId" UUID,
    "resourceId" TEXT,
    "conditions" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipLimit" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "membresiaId" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "decimalValue" DECIMAL(18,4),
    "integerValue" INTEGER,
    "moneda" CHAR(3),
    "vigenteHasta" TIMESTAMP(3),

    CONSTRAINT "MembershipLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "padreId" UUID,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "sunatCode" VARCHAR(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 3,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sunatTributeCode" TEXT,
    "affectation" "AfectacionImpuesto" NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "includedInPrice" BOOLEAN NOT NULL DEFAULT true,
    "vigenteDesde" TIMESTAMP(3),
    "vigenteHasta" TIMESTAMP(3),
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "marcaId" UUID,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "kind" "TipoProducto" NOT NULL DEFAULT 'ESTANDAR',
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "inquilinoId" UUID NOT NULL,
    "productoId" UUID NOT NULL,
    "categoriaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productoId","categoriaId")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "productoId" UUID NOT NULL,
    "unidadMedidaId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "attributes" JSONB,
    "cost" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "weight" DECIMAL(18,6),
    "isStockTracked" BOOLEAN NOT NULL DEFAULT true,
    "tracksLots" BOOLEAN NOT NULL DEFAULT false,
    "tracksSerials" BOOLEAN NOT NULL DEFAULT false,
    "isWeighted" BOOLEAN NOT NULL DEFAULT false,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBarcodigo" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCodigoBarras" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBarcodigo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "productoId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariantTax" (
    "inquilinoId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "taxId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductVariantTax_pkey" PRIMARY KEY ("varianteId","taxId")
);

-- CreateTable
CREATE TABLE "ProductBundleItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "bundleProductId" UUID NOT NULL,
    "componentVariantId" UUID NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "ProductBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "iniciaEn" TIMESTAMP(3),
    "terminaEn" TIMESTAMP(3),
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "listaPreciosId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "minQuantity" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "monto" DECIMAL(18,6) NOT NULL,
    "iniciaEn" TIMESTAMP(3),
    "terminaEn" TIMESTAMP(3),

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCliente" NOT NULL,
    "documentType" "TipoDocumentoIdentidad",
    "documentNumber" TEXT,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "defaultCurrency" CHAR(3) NOT NULL DEFAULT 'PEN',
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "label" TEXT,
    "address" TEXT NOT NULL,
    "ubigeo" VARCHAR(6),
    "department" TEXT,
    "province" TEXT,
    "district" TEXT,
    "isBilling" BOOLEAN NOT NULL DEFAULT false,
    "isShipping" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCreditAccount" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "creditLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoCuentaCredito" NOT NULL DEFAULT 'ACTIVA',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "documentType" "TipoDocumentoIdentidad",
    "documentNumber" TEXT,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "almacenId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "enStock" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "enTransito" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "available" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "costoPromedio" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLedgerEntry" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "almacenId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "loteId" UUID,
    "serieId" UUID,
    "movementType" "TipoMovimientoInventario" NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "costoUnitario" DECIMAL(18,6),
    "totalCost" DECIMAL(18,6),
    "referenciaType" TEXT NOT NULL,
    "referenciaId" UUID NOT NULL,
    "correlationId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "almacenId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "manufacturedAt" TIMESTAMP(3),
    "venceEn" TIMESTAMP(3),
    "cantidad" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySerial" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "almacenId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "estado" "EstadoSerieInventario" NOT NULL DEFAULT 'DISPONIBLE',
    "acquiredAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySerial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "almacenId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "cantidadAtendida" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "estado" "EstadoReservaInventario" NOT NULL DEFAULT 'ACTIVA',
    "referenciaType" TEXT NOT NULL,
    "referenciaId" UUID NOT NULL,
    "venceEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "almacenOrigenId" UUID NOT NULL,
    "almacenDestinoId" UUID NOT NULL,
    "estado" "EstadoTransferenciaInventario" NOT NULL DEFAULT 'BORRADOR',
    "solicitadoPorId" UUID,
    "aprobadoPorId" UUID,
    "shippedAt" TIMESTAMP(3),
    "recibidoEn" TIMESTAMP(3),
    "notes" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransferItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "transferId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "requestedQty" DECIMAL(18,6) NOT NULL,
    "shippedQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "receivedQty" DECIMAL(18,6) NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "almacenId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "estado" "EstadoConteoInventario" NOT NULL DEFAULT 'BORRADOR',
    "contadoPorId" UUID,
    "aprobadoPorId" UUID,
    "iniciadoEn" TIMESTAMP(3),
    "completadoEn" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "countId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "loteId" UUID,
    "cantidadEsperada" DECIMAL(18,6) NOT NULL,
    "cantidadContada" DECIMAL(18,6),
    "cantidadDiferencia" DECIMAL(18,6),
    "motivo" TEXT,

    CONSTRAINT "InventoryCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "clienteId" UUID,
    "number" TEXT NOT NULL,
    "estado" "EstadoDocumentoComercial" NOT NULL DEFAULT 'BORRADOR',
    "moneda" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDescuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vigenteHasta" TIMESTAMP(3),
    "customerSnapshot" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "cotizacionId" UUID NOT NULL,
    "varianteId" UUID,
    "descripcion" TEXT NOT NULL,
    "skuSnapshot" TEXT,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "precioUnitario" DECIMAL(18,6) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "clienteId" UUID,
    "cotizacionId" UUID,
    "number" TEXT NOT NULL,
    "estado" "EstadoDocumentoComercial" NOT NULL DEFAULT 'BORRADOR',
    "moneda" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDescuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "promisedAt" TIMESTAMP(3),
    "customerSnapshot" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "pedidoVentaId" UUID NOT NULL,
    "varianteId" UUID,
    "descripcion" TEXT NOT NULL,
    "skuSnapshot" TEXT,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "cantidadAtendida" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "precioUnitario" DECIMAL(18,6) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "terminalId" UUID,
    "sesionCajaId" UUID,
    "clienteId" UUID,
    "cotizacionId" UUID,
    "pedidoVentaId" UUID,
    "cashierMembershipId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "offlineId" TEXT,
    "offlineDeviceId" TEXT,
    "offlineCreatedAt" TIMESTAMP(3),
    "sincronizadoEn" TIMESTAMP(3),
    "estado" "EstadoVenta" NOT NULL DEFAULT 'BORRADOR',
    "moneda" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDescuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPagado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalVuelto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "customerSnapshot" JSONB,
    "billingAddressSnapshot" JSONB,
    "completadoEn" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "varianteId" UUID,
    "lineNumber" INTEGER NOT NULL,
    "skuSnapshot" TEXT,
    "nombreSnapshot" TEXT NOT NULL,
    "unitCodeSnapshot" TEXT,
    "AfectacionImpuesto" "AfectacionImpuesto" NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "precioUnitario" DECIMAL(18,6) NOT NULL,
    "valorUnitario" DECIMAL(18,6) NOT NULL,
    "montoBruto" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleDiscount" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "rate" DECIMAL(9,6),
    "monto" DECIMAL(18,2) NOT NULL,
    "authorizedById" UUID,

    CONSTRAINT "SaleDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItemDiscount" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "itemVentaId" UUID NOT NULL,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "rate" DECIMAL(9,6),
    "monto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SaleItemDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleTax" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "taxCode" TEXT NOT NULL,
    "taxName" TEXT NOT NULL,
    "taxableBase" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(9,6) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SaleTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItemTax" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "itemVentaId" UUID NOT NULL,
    "taxCode" TEXT NOT NULL,
    "taxableBase" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(9,6) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SaleItemTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "transaccionPagoId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "method" "MetodoPago" NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "referencia" TEXT,
    "pagadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRefund" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "estado" "EstadoDevolucionVenta" NOT NULL DEFAULT 'BORRADOR',
    "motivo" TEXT NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "solicitadoPorId" UUID NOT NULL,
    "aprobadoPorId" UUID,
    "completadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRefundItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "devolucionVentaId" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "itemVentaId" UUID NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "unitAmount" DECIMAL(18,6) NOT NULL,
    "montoImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "restock" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SaleRefundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleReference" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sourceSaleId" UUID NOT NULL,
    "targetSaleId" UUID NOT NULL,
    "referenciaType" TEXT NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "cajaId" UUID NOT NULL,
    "terminalId" UUID,
    "abiertoPorId" UUID NOT NULL,
    "cerradoPorId" UUID,
    "estado" "EstadoSesionCaja" NOT NULL DEFAULT 'ABIERTA',
    "openingAmount" DECIMAL(18,2) NOT NULL,
    "expectedAmount" DECIMAL(18,2),
    "declaredAmount" DECIMAL(18,2),
    "differenceAmount" DECIMAL(18,2),
    "abiertoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sesionCajaId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "motivo" TEXT,
    "referenciaType" TEXT,
    "referenciaId" TEXT,
    "actorId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashCount" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sesionCajaId" UUID NOT NULL,
    "denomination" DECIMAL(18,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contadoPorId" UUID NOT NULL,

    CONSTRAINT "CashCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashReconciliation" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sesionCajaId" UUID NOT NULL,
    "expectedAmount" DECIMAL(18,2) NOT NULL,
    "declaredAmount" DECIMAL(18,2) NOT NULL,
    "differenceAmount" DECIMAL(18,2) NOT NULL,
    "motivo" TEXT,
    "reconciledById" UUID NOT NULL,
    "aprobadoPorId" UUID,
    "conciliadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderAccount" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referenciaComerciante" TEXT NOT NULL,
    "referenciaSecretaCifrada" TEXT,
    "settings" JSONB,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "cuentaProveedorId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "intentoProveedorId" TEXT,
    "estado" "EstadoIntentoPago" NOT NULL DEFAULT 'CREADO',
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "method" "MetodoPago" NOT NULL,
    "descripcion" TEXT,
    "venceEn" TIMESTAMP(3),
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "intentoPagoId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "transaccionProveedorId" TEXT,
    "estado" "EstadoTransaccionPago" NOT NULL DEFAULT 'PENDIENTE',
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "codigoAutorizacion" TEXT,
    "referenciaProveedor" TEXT,
    "codigoError" TEXT,
    "mensajeError" TEXT,
    "procesadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "transaccionPagoId" UUID NOT NULL,
    "devolucionVentaId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "devolucionProveedorId" TEXT,
    "estado" "EstadoDevolucionPago" NOT NULL DEFAULT 'PENDIENTE',
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "motivo" TEXT,
    "procesadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "cuentaProveedorId" UUID NOT NULL,
    "eventoProveedorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signature" TEXT,
    "cuerpoCrudo" BYTEA NOT NULL,
    "encabezados" JSONB,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesadoEn" TIMESTAMP(3),
    "processingError" TEXT,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettlement" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "cuentaProveedorId" UUID NOT NULL,
    "referenciaProveedor" TEXT NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'PENDIENTE',
    "moneda" CHAR(3) NOT NULL,
    "montoBruto" DECIMAL(18,2) NOT NULL,
    "feeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoNeto" DECIMAL(18,2) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettlementItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "settlementId" UUID NOT NULL,
    "transaccionPagoId" UUID NOT NULL,
    "montoBruto" DECIMAL(18,2) NOT NULL,
    "feeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoNeto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PaymentSettlementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSeries" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "sucursalId" UUID,
    "documentType" "TipoDocumentoElectronico" NOT NULL,
    "series" TEXT NOT NULL,
    "nextNumber" BIGINT NOT NULL DEFAULT 1,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SunatCertificate" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "certificateFileId" UUID,
    "referenciaSecretaCifrada" TEXT NOT NULL,
    "serialNumber" TEXT,
    "subject" TEXT,
    "issuer" TEXT,
    "fingerprintSha256" TEXT,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SunatCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocument" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "ventaId" UUID,
    "seriesId" UUID NOT NULL,
    "documentType" "TipoDocumentoElectronico" NOT NULL,
    "series" TEXT NOT NULL,
    "number" BIGINT NOT NULL,
    "estado" "EstadoDocumentoElectronico" NOT NULL DEFAULT 'BORRADOR',
    "customerDocumentType" "TipoDocumentoIdentidad",
    "customerDocumentNumber" TEXT,
    "customerName" TEXT,
    "issuerSnapshot" JSONB NOT NULL,
    "customerSnapshot" JSONB NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "taxableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exemptTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unaffectedTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "freeTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDescuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "chargeTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paymentTerms" "TerminosPagoFiscal" NOT NULL DEFAULT 'CONTADO',
    "noteReasonCode" TEXT,
    "noteReasonText" TEXT,
    "relatedDocumentType" "TipoDocumentoElectronico",
    "relatedSeries" TEXT,
    "relatedNumber" BIGINT,
    "sunatTicket" TEXT,
    "sunatResponseCode" TEXT,
    "sunatDescription" TEXT,
    "xmlFileId" UUID,
    "cdrFileId" UUID,
    "pdfFileId" UUID,
    "enviadoEn" TIMESTAMP(3),
    "aceptadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "documentoElectronicoId" UUID NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "varianteId" UUID,
    "sku" TEXT,
    "descripcion" TEXT NOT NULL,
    "sunatUnitCode" TEXT NOT NULL,
    "affectation" "AfectacionImpuesto" NOT NULL,
    "taxSchemeId" TEXT NOT NULL,
    "taxSchemeName" TEXT NOT NULL,
    "taxCategoryCode" TEXT NOT NULL,
    "priceTypeCode" TEXT NOT NULL,
    "taxPercent" DECIMAL(7,4) NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "valorUnitario" DECIMAL(18,6) NOT NULL,
    "precioUnitario" DECIMAL(18,6) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxableBase" DECIMAL(18,2) NOT NULL,
    "montoImpuesto" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "ElectronicDocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentLegend" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "documentoElectronicoId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "ElectronicDocumentLegend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentCreditInstallment" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "documentoElectronicoId" UUID NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,

    CONSTRAINT "ElectronicDocumentCreditInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocumentEvent" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "documentoElectronicoId" UUID NOT NULL,
    "estado" "EstadoDocumentoElectronico" NOT NULL,
    "eventType" TEXT NOT NULL,
    "cargaSolicitud" JSONB,
    "cargaRespuesta" JSONB,
    "message" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectronicDocumentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "sucursalId" UUID NOT NULL,
    "proveedorId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "moneda" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDescuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expectedAt" TIMESTAMP(3),
    "aprobadoPorId" UUID,
    "notes" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "pedidoCompraId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "receivedQty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(18,6) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montoImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "pedidoCompraId" UUID,
    "almacenId" UUID NOT NULL,
    "proveedorId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "supplierDocumentType" TEXT,
    "supplierSeries" TEXT,
    "supplierNumber" TEXT,
    "estado" "EstadoRecepcionCompra" NOT NULL DEFAULT 'BORRADOR',
    "moneda" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "recibidoEn" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptItem" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "recepcionCompraId" UUID NOT NULL,
    "varianteId" UUID NOT NULL,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "costoUnitario" DECIMAL(18,6) NOT NULL,
    "montoImpuesto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "lotNumber" TEXT,
    "venceEn" TIMESTAMP(3),

    CONSTRAINT "PurchaseReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "proveedorId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "method" "MetodoPago" NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "referencia" TEXT,
    "pagadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountsReceivable" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "montoOriginal" DECIMAL(18,2) NOT NULL,
    "montoPendiente" DECIMAL(18,2) NOT NULL,
    "estado" "EstadoCuentaPorCobrarPagar" NOT NULL DEFAULT 'PENDIENTE',
    "emitidoEn" TIMESTAMP(3) NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivableInstallment" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "receivableId" UUID NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "montoPendiente" DECIMAL(18,2) NOT NULL,
    "estado" "EstadoCuentaPorCobrarPagar" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "ReceivableInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivablePayment" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "method" "MetodoPago" NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "referencia" TEXT,
    "pagadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "ReceivablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivablePaymentAllocation" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "installmentId" UUID NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "ReceivablePaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountsPayable" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "proveedorId" UUID NOT NULL,
    "recepcionCompraId" UUID NOT NULL,
    "moneda" CHAR(3) NOT NULL,
    "montoOriginal" DECIMAL(18,2) NOT NULL,
    "montoPendiente" DECIMAL(18,2) NOT NULL,
    "estado" "EstadoCuentaPorCobrarPagar" NOT NULL DEFAULT 'PENDIENTE',
    "emitidoEn" TIMESTAMP(3) NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsPayable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayableInstallment" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "payableId" UUID NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "montoPendiente" DECIMAL(18,2) NOT NULL,
    "estado" "EstadoCuentaPorCobrarPagar" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "PayableInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayablePaymentAllocation" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "installmentId" UUID NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PayablePaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "actorIdentityId" UUID,
    "actorMembershipId" UUID,
    "approverMembershipId" UUID,
    "deviceId" TEXT,
    "ipAddress" INET,
    "userAgent" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "motivo" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "correlationId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "carga" JSONB NOT NULL,
    "encabezados" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disponibleEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadoEn" TIMESTAMP(3),
    "bloqueadoEn" TIMESTAMP(3),
    "lockedBy" TEXT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimoError" TEXT,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "referenciaSecretaCifrada" TEXT NOT NULL,
    "eventosSuscritos" TEXT[],
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "endpointId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "estado" "EstadoEntregaWebhook" NOT NULL DEFAULT 'PENDIENTE',
    "requestBody" JSONB NOT NULL,
    "estadoRespuesta" INTEGER,
    "cuerpoRespuesta" TEXT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "proximoIntentoEn" TIMESTAMP(3),
    "bloqueadoEn" TIMESTAMP(3),
    "lockedBy" TEXT,
    "ultimoError" TEXT,
    "entregadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileObject" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "metadata" JSONB,
    "createdById" UUID,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "inquilinoId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "subject" TEXT,
    "carga" JSONB NOT NULL,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "programadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimoError" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_codigo_key" ON "Tenant"("codigo");

-- CreateIndex
CREATE INDEX "Organization_inquilinoId_estado_idx" ON "Organization"("inquilinoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_inquilinoId_codigo_key" ON "Organization"("inquilinoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_inquilinoId_id_key" ON "Organization"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "Company_inquilinoId_organizacionId_estado_idx" ON "Company"("inquilinoId", "organizacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Company_inquilinoId_ruc_key" ON "Company"("inquilinoId", "ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Company_inquilinoId_id_key" ON "Company"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "Branch_inquilinoId_empresaId_estado_idx" ON "Branch"("inquilinoId", "empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_inquilinoId_empresaId_codigo_key" ON "Branch"("inquilinoId", "empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_inquilinoId_id_key" ON "Branch"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_inquilinoId_empresaId_id_key" ON "Branch"("inquilinoId", "empresaId", "id");

-- CreateIndex
CREATE INDEX "Warehouse_inquilinoId_sucursalId_estado_idx" ON "Warehouse"("inquilinoId", "sucursalId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_inquilinoId_sucursalId_codigo_key" ON "Warehouse"("inquilinoId", "sucursalId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_inquilinoId_id_key" ON "Warehouse"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "CashRegister_inquilinoId_sucursalId_estado_idx" ON "CashRegister"("inquilinoId", "sucursalId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "CashRegister_inquilinoId_sucursalId_codigo_key" ON "CashRegister"("inquilinoId", "sucursalId", "codigo");

-- CreateIndex
CREATE INDEX "Terminal_inquilinoId_sucursalId_estado_idx" ON "Terminal"("inquilinoId", "sucursalId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_inquilinoId_sucursalId_codigo_key" ON "Terminal"("inquilinoId", "sucursalId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_inquilinoId_claveDispositivo_key" ON "Terminal"("inquilinoId", "claveDispositivo");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_inquilinoId_sucursalId_id_key" ON "Terminal"("inquilinoId", "sucursalId", "id");

-- CreateIndex
CREATE INDEX "UserIdentity_inquilinoId_estado_idx" ON "UserIdentity"("inquilinoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_inquilinoId_sujetoExterno_key" ON "UserIdentity"("inquilinoId", "sujetoExterno");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_inquilinoId_email_key" ON "UserIdentity"("inquilinoId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_inquilinoId_id_key" ON "UserIdentity"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "Membership_inquilinoId_identidadUsuarioId_estado_idx" ON "Membership"("inquilinoId", "identidadUsuarioId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_inquilinoId_organizacionId_identidadUsuarioId_key" ON "Membership"("inquilinoId", "organizacionId", "identidadUsuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_inquilinoId_id_key" ON "Membership"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "Role_inquilinoId_estado_idx" ON "Role"("inquilinoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Role_inquilinoId_codigo_key" ON "Role"("inquilinoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_clave_key" ON "Permission"("clave");

-- CreateIndex
CREATE INDEX "RolePermission_inquilinoId_permisoId_idx" ON "RolePermission"("inquilinoId", "permisoId");

-- CreateIndex
CREATE INDEX "MembershipRole_inquilinoId_sucursalId_idx" ON "MembershipRole"("inquilinoId", "sucursalId");

-- CreateIndex
CREATE INDEX "AccessPolicy_inquilinoId_membresiaId_permissionKey_idx" ON "AccessPolicy"("inquilinoId", "membresiaId", "permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipLimit_inquilinoId_membresiaId_clave_key" ON "MembershipLimit"("inquilinoId", "membresiaId", "clave");

-- CreateIndex
CREATE INDEX "Category_inquilinoId_padreId_estado_idx" ON "Category"("inquilinoId", "padreId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Category_inquilinoId_codigo_key" ON "Category"("inquilinoId", "codigo");

-- CreateIndex
CREATE INDEX "Brand_inquilinoId_estado_idx" ON "Brand"("inquilinoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_inquilinoId_codigo_key" ON "Brand"("inquilinoId", "codigo");

-- CreateIndex
CREATE INDEX "UnitOfMeasure_inquilinoId_sunatCode_estado_idx" ON "UnitOfMeasure"("inquilinoId", "sunatCode", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_inquilinoId_codigo_key" ON "UnitOfMeasure"("inquilinoId", "codigo");

-- CreateIndex
CREATE INDEX "Tax_inquilinoId_estado_vigenteDesde_idx" ON "Tax"("inquilinoId", "estado", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "Tax_inquilinoId_codigo_key" ON "Tax"("inquilinoId", "codigo");

-- CreateIndex
CREATE INDEX "Product_inquilinoId_nombre_estado_idx" ON "Product"("inquilinoId", "nombre", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Product_inquilinoId_codigo_key" ON "Product"("inquilinoId", "codigo");

-- CreateIndex
CREATE INDEX "ProductCategory_inquilinoId_categoriaId_idx" ON "ProductCategory"("inquilinoId", "categoriaId");

-- CreateIndex
CREATE INDEX "ProductVariant_inquilinoId_productoId_estado_idx" ON "ProductVariant"("inquilinoId", "productoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_inquilinoId_sku_key" ON "ProductVariant"("inquilinoId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_inquilinoId_id_key" ON "ProductVariant"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "ProductBarcodigo_inquilinoId_varianteId_idx" ON "ProductBarcodigo"("inquilinoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcodigo_inquilinoId_codigo_key" ON "ProductBarcodigo"("inquilinoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_inquilinoId_productoId_fileId_key" ON "ProductImage"("inquilinoId", "productoId", "fileId");

-- CreateIndex
CREATE INDEX "ProductVariantTax_inquilinoId_taxId_idx" ON "ProductVariantTax"("inquilinoId", "taxId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBundleItem_inquilinoId_bundleProductId_componentVari_key" ON "ProductBundleItem"("inquilinoId", "bundleProductId", "componentVariantId");

-- CreateIndex
CREATE INDEX "PriceList_inquilinoId_empresaId_estado_iniciaEn_idx" ON "PriceList"("inquilinoId", "empresaId", "estado", "iniciaEn");

-- CreateIndex
CREATE UNIQUE INDEX "PriceList_inquilinoId_empresaId_codigo_key" ON "PriceList"("inquilinoId", "empresaId", "codigo");

-- CreateIndex
CREATE INDEX "PriceListItem_inquilinoId_varianteId_iniciaEn_terminaEn_idx" ON "PriceListItem"("inquilinoId", "varianteId", "iniciaEn", "terminaEn");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_inquilinoId_listaPreciosId_varianteId_minQuan_key" ON "PriceListItem"("inquilinoId", "listaPreciosId", "varianteId", "minQuantity");

-- CreateIndex
CREATE INDEX "Customer_inquilinoId_razonSocial_estado_idx" ON "Customer"("inquilinoId", "razonSocial", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_inquilinoId_codigo_key" ON "Customer"("inquilinoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_inquilinoId_documentType_documentNumber_key" ON "Customer"("inquilinoId", "documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_inquilinoId_id_key" ON "Customer"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "CustomerAddress_inquilinoId_clienteId_idx" ON "CustomerAddress"("inquilinoId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCreditAccount_inquilinoId_clienteId_moneda_key" ON "CustomerCreditAccount"("inquilinoId", "clienteId", "moneda");

-- CreateIndex
CREATE INDEX "Supplier_inquilinoId_razonSocial_estado_idx" ON "Supplier"("inquilinoId", "razonSocial", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_inquilinoId_codigo_key" ON "Supplier"("inquilinoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_inquilinoId_documentType_documentNumber_key" ON "Supplier"("inquilinoId", "documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_inquilinoId_id_key" ON "Supplier"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "StockBalance_inquilinoId_almacenId_varianteId_idx" ON "StockBalance"("inquilinoId", "almacenId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_inquilinoId_almacenId_varianteId_key" ON "StockBalance"("inquilinoId", "almacenId", "varianteId");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_inquilinoId_almacenId_varianteId_occur_idx" ON "InventoryLedgerEntry"("inquilinoId", "almacenId", "varianteId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_inquilinoId_referenciaType_referenciaI_idx" ON "InventoryLedgerEntry"("inquilinoId", "referenciaType", "referenciaId");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_inquilinoId_correlationId_idx" ON "InventoryLedgerEntry"("inquilinoId", "correlationId");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_inquilinoId_loteId_idx" ON "InventoryLedgerEntry"("inquilinoId", "loteId");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_inquilinoId_serieId_idx" ON "InventoryLedgerEntry"("inquilinoId", "serieId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLedgerEntry_inquilinoId_idempotencyKey_key" ON "InventoryLedgerEntry"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryLot_inquilinoId_almacenId_varianteId_venceEn_idx" ON "InventoryLot"("inquilinoId", "almacenId", "varianteId", "venceEn");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_inquilinoId_almacenId_varianteId_lotNumber_key" ON "InventoryLot"("inquilinoId", "almacenId", "varianteId", "lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_inquilinoId_id_key" ON "InventoryLot"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "InventorySerial_inquilinoId_almacenId_varianteId_estado_idx" ON "InventorySerial"("inquilinoId", "almacenId", "varianteId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySerial_inquilinoId_serialNumber_key" ON "InventorySerial"("inquilinoId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySerial_inquilinoId_id_key" ON "InventorySerial"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "InventoryReservation_inquilinoId_almacenId_varianteId_estad_idx" ON "InventoryReservation"("inquilinoId", "almacenId", "varianteId", "estado");

-- CreateIndex
CREATE INDEX "InventoryReservation_inquilinoId_referenciaType_referenciaI_idx" ON "InventoryReservation"("inquilinoId", "referenciaType", "referenciaId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_inquilinoId_almacenOrigenId_estado_creado_idx" ON "InventoryTransfer"("inquilinoId", "almacenOrigenId", "estado", "creadoEn");

-- CreateIndex
CREATE INDEX "InventoryTransfer_inquilinoId_almacenDestinoId_estado_cread_idx" ON "InventoryTransfer"("inquilinoId", "almacenDestinoId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_inquilinoId_number_key" ON "InventoryTransfer"("inquilinoId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_inquilinoId_id_key" ON "InventoryTransfer"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "InventoryTransferItem_inquilinoId_varianteId_idx" ON "InventoryTransferItem"("inquilinoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransferItem_inquilinoId_transferId_varianteId_key" ON "InventoryTransferItem"("inquilinoId", "transferId", "varianteId");

-- CreateIndex
CREATE INDEX "InventoryCount_inquilinoId_almacenId_estado_creadoEn_idx" ON "InventoryCount"("inquilinoId", "almacenId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_inquilinoId_number_key" ON "InventoryCount"("inquilinoId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_inquilinoId_id_key" ON "InventoryCount"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "InventoryCountItem_inquilinoId_countId_varianteId_idx" ON "InventoryCountItem"("inquilinoId", "countId", "varianteId");

-- CreateIndex
CREATE INDEX "Quotation_inquilinoId_sucursalId_estado_creadoEn_idx" ON "Quotation"("inquilinoId", "sucursalId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_inquilinoId_sucursalId_number_key" ON "Quotation"("inquilinoId", "sucursalId", "number");

-- CreateIndex
CREATE INDEX "QuotationItem_inquilinoId_cotizacionId_idx" ON "QuotationItem"("inquilinoId", "cotizacionId");

-- CreateIndex
CREATE INDEX "QuotationItem_inquilinoId_varianteId_idx" ON "QuotationItem"("inquilinoId", "varianteId");

-- CreateIndex
CREATE INDEX "SalesOrder_inquilinoId_sucursalId_estado_creadoEn_idx" ON "SalesOrder"("inquilinoId", "sucursalId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_inquilinoId_sucursalId_number_key" ON "SalesOrder"("inquilinoId", "sucursalId", "number");

-- CreateIndex
CREATE INDEX "SalesOrderItem_inquilinoId_pedidoVentaId_idx" ON "SalesOrderItem"("inquilinoId", "pedidoVentaId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_inquilinoId_varianteId_idx" ON "SalesOrderItem"("inquilinoId", "varianteId");

-- CreateIndex
CREATE INDEX "Sale_inquilinoId_sucursalId_estado_creadoEn_idx" ON "Sale"("inquilinoId", "sucursalId", "estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Sale_inquilinoId_clienteId_creadoEn_idx" ON "Sale"("inquilinoId", "clienteId", "creadoEn");

-- CreateIndex
CREATE INDEX "Sale_inquilinoId_empresaId_creadoEn_idx" ON "Sale"("inquilinoId", "empresaId", "creadoEn");

-- CreateIndex
CREATE INDEX "Sale_inquilinoId_terminalId_idx" ON "Sale"("inquilinoId", "terminalId");

-- CreateIndex
CREATE INDEX "Sale_inquilinoId_sesionCajaId_idx" ON "Sale"("inquilinoId", "sesionCajaId");

-- CreateIndex
CREATE INDEX "Sale_inquilinoId_cashierMembershipId_idx" ON "Sale"("inquilinoId", "cashierMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_inquilinoId_idempotencyKey_key" ON "Sale"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_inquilinoId_sucursalId_number_key" ON "Sale"("inquilinoId", "sucursalId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_inquilinoId_offlineDeviceId_offlineId_key" ON "Sale"("inquilinoId", "offlineDeviceId", "offlineId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_inquilinoId_id_key" ON "Sale"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_inquilinoId_clienteId_id_key" ON "Sale"("inquilinoId", "clienteId", "id");

-- CreateIndex
CREATE INDEX "SaleItem_inquilinoId_varianteId_idx" ON "SaleItem"("inquilinoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_inquilinoId_ventaId_lineNumber_key" ON "SaleItem"("inquilinoId", "ventaId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_inquilinoId_ventaId_id_key" ON "SaleItem"("inquilinoId", "ventaId", "id");

-- CreateIndex
CREATE INDEX "SaleDiscount_inquilinoId_ventaId_idx" ON "SaleDiscount"("inquilinoId", "ventaId");

-- CreateIndex
CREATE INDEX "SaleItemDiscount_inquilinoId_itemVentaId_idx" ON "SaleItemDiscount"("inquilinoId", "itemVentaId");

-- CreateIndex
CREATE INDEX "SaleTax_inquilinoId_ventaId_idx" ON "SaleTax"("inquilinoId", "ventaId");

-- CreateIndex
CREATE INDEX "SaleItemTax_inquilinoId_itemVentaId_idx" ON "SaleItemTax"("inquilinoId", "itemVentaId");

-- CreateIndex
CREATE INDEX "SalePayment_inquilinoId_ventaId_pagadoEn_idx" ON "SalePayment"("inquilinoId", "ventaId", "pagadoEn");

-- CreateIndex
CREATE INDEX "SalePayment_inquilinoId_transaccionPagoId_idx" ON "SalePayment"("inquilinoId", "transaccionPagoId");

-- CreateIndex
CREATE UNIQUE INDEX "SalePayment_inquilinoId_idempotencyKey_key" ON "SalePayment"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SaleRefund_inquilinoId_ventaId_estado_creadoEn_idx" ON "SaleRefund"("inquilinoId", "ventaId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "SaleRefund_inquilinoId_number_key" ON "SaleRefund"("inquilinoId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "SaleRefund_inquilinoId_idempotencyKey_key" ON "SaleRefund"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SaleRefund_inquilinoId_ventaId_id_key" ON "SaleRefund"("inquilinoId", "ventaId", "id");

-- CreateIndex
CREATE INDEX "SaleRefundItem_inquilinoId_devolucionVentaId_idx" ON "SaleRefundItem"("inquilinoId", "devolucionVentaId");

-- CreateIndex
CREATE INDEX "SaleRefundItem_inquilinoId_ventaId_itemVentaId_idx" ON "SaleRefundItem"("inquilinoId", "ventaId", "itemVentaId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleReference_inquilinoId_sourceSaleId_targetSaleId_referen_key" ON "SaleReference"("inquilinoId", "sourceSaleId", "targetSaleId", "referenciaType");

-- CreateIndex
CREATE INDEX "CashSession_inquilinoId_sucursalId_estado_abiertoEn_idx" ON "CashSession"("inquilinoId", "sucursalId", "estado", "abiertoEn");

-- CreateIndex
CREATE INDEX "CashSession_inquilinoId_cajaId_estado_idx" ON "CashSession"("inquilinoId", "cajaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "CashSession_inquilinoId_sucursalId_id_key" ON "CashSession"("inquilinoId", "sucursalId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CashSession_inquilinoId_id_key" ON "CashSession"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "CashMovement_inquilinoId_sesionCajaId_occurredAt_idx" ON "CashMovement"("inquilinoId", "sesionCajaId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_inquilinoId_idempotencyKey_key" ON "CashMovement"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CashCount_inquilinoId_sesionCajaId_idx" ON "CashCount"("inquilinoId", "sesionCajaId");

-- CreateIndex
CREATE UNIQUE INDEX "CashReconciliation_sesionCajaId_key" ON "CashReconciliation"("sesionCajaId");

-- CreateIndex
CREATE INDEX "CashReconciliation_inquilinoId_conciliadoEn_idx" ON "CashReconciliation"("inquilinoId", "conciliadoEn");

-- CreateIndex
CREATE INDEX "PaymentProviderAccount_inquilinoId_empresaId_estado_idx" ON "PaymentProviderAccount"("inquilinoId", "empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderAccount_inquilinoId_proveedor_referenciaCome_key" ON "PaymentProviderAccount"("inquilinoId", "proveedor", "referenciaComerciante");

-- CreateIndex
CREATE INDEX "PaymentIntent_inquilinoId_estado_creadoEn_idx" ON "PaymentIntent"("inquilinoId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_inquilinoId_idempotencyKey_key" ON "PaymentIntent"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_inquilinoId_cuentaProveedorId_intentoProveedo_key" ON "PaymentIntent"("inquilinoId", "cuentaProveedorId", "intentoProveedorId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_inquilinoId_estado_creadoEn_idx" ON "PaymentTransaction"("inquilinoId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_inquilinoId_transaccionProveedorId_key" ON "PaymentTransaction"("inquilinoId", "transaccionProveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_inquilinoId_idempotencyKey_key" ON "PaymentTransaction"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_inquilinoId_id_key" ON "PaymentTransaction"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "PaymentRefund_inquilinoId_estado_creadoEn_idx" ON "PaymentRefund"("inquilinoId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_inquilinoId_idempotencyKey_key" ON "PaymentRefund"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_inquilinoId_devolucionProveedorId_key" ON "PaymentRefund"("inquilinoId", "devolucionProveedorId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_inquilinoId_procesadoEn_recibidoEn_idx" ON "PaymentWebhookEvent"("inquilinoId", "procesadoEn", "recibidoEn");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_inquilinoId_cuentaProveedorId_eventoPro_key" ON "PaymentWebhookEvent"("inquilinoId", "cuentaProveedorId", "eventoProveedorId");

-- CreateIndex
CREATE INDEX "PaymentSettlement_inquilinoId_estado_creadoEn_idx" ON "PaymentSettlement"("inquilinoId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettlement_inquilinoId_cuentaProveedorId_referenciaP_key" ON "PaymentSettlement"("inquilinoId", "cuentaProveedorId", "referenciaProveedor");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettlementItem_inquilinoId_settlementId_transaccionP_key" ON "PaymentSettlementItem"("inquilinoId", "settlementId", "transaccionPagoId");

-- CreateIndex
CREATE INDEX "DocumentSeries_inquilinoId_empresaId_estado_idx" ON "DocumentSeries"("inquilinoId", "empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSeries_inquilinoId_empresaId_documentType_series_key" ON "DocumentSeries"("inquilinoId", "empresaId", "documentType", "series");

-- CreateIndex
CREATE INDEX "SunatCertificate_inquilinoId_empresaId_estado_vigenteHasta_idx" ON "SunatCertificate"("inquilinoId", "empresaId", "estado", "vigenteHasta");

-- CreateIndex
CREATE INDEX "ElectronicDocument_inquilinoId_sucursalId_estado_issueDate_idx" ON "ElectronicDocument"("inquilinoId", "sucursalId", "estado", "issueDate");

-- CreateIndex
CREATE INDEX "ElectronicDocument_inquilinoId_ventaId_idx" ON "ElectronicDocument"("inquilinoId", "ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocument_inquilinoId_empresaId_documentType_serie_key" ON "ElectronicDocument"("inquilinoId", "empresaId", "documentType", "series", "number");

-- CreateIndex
CREATE INDEX "ElectronicDocumentItem_inquilinoId_varianteId_idx" ON "ElectronicDocumentItem"("inquilinoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocumentItem_inquilinoId_documentoElectronicoId_l_key" ON "ElectronicDocumentItem"("inquilinoId", "documentoElectronicoId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocumentLegend_inquilinoId_documentoElectronicoId_key" ON "ElectronicDocumentLegend"("inquilinoId", "documentoElectronicoId", "codigo");

-- CreateIndex
CREATE INDEX "ElectronicDocumentCreditInstallment_inquilinoId_venceEn_idx" ON "ElectronicDocumentCreditInstallment"("inquilinoId", "venceEn");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocumentCreditInstallment_inquilinoId_documentoEl_key" ON "ElectronicDocumentCreditInstallment"("inquilinoId", "documentoElectronicoId", "installmentNo");

-- CreateIndex
CREATE INDEX "ElectronicDocumentEvent_inquilinoId_documentoElectronicoId__idx" ON "ElectronicDocumentEvent"("inquilinoId", "documentoElectronicoId", "occurredAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_inquilinoId_sucursalId_estado_creadoEn_idx" ON "PurchaseOrder"("inquilinoId", "sucursalId", "estado", "creadoEn");

-- CreateIndex
CREATE INDEX "PurchaseOrder_inquilinoId_proveedorId_estado_idx" ON "PurchaseOrder"("inquilinoId", "proveedorId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_inquilinoId_sucursalId_number_key" ON "PurchaseOrder"("inquilinoId", "sucursalId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_inquilinoId_id_key" ON "PurchaseOrder"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_inquilinoId_proveedorId_id_key" ON "PurchaseOrder"("inquilinoId", "proveedorId", "id");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_inquilinoId_varianteId_idx" ON "PurchaseOrderItem"("inquilinoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderItem_inquilinoId_pedidoCompraId_varianteId_key" ON "PurchaseOrderItem"("inquilinoId", "pedidoCompraId", "varianteId");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_inquilinoId_almacenId_estado_creadoEn_idx" ON "PurchaseReceipt"("inquilinoId", "almacenId", "estado", "creadoEn");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_inquilinoId_proveedorId_estado_creadoEn_idx" ON "PurchaseReceipt"("inquilinoId", "proveedorId", "estado", "creadoEn");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_inquilinoId_pedidoCompraId_idx" ON "PurchaseReceipt"("inquilinoId", "pedidoCompraId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_inquilinoId_number_key" ON "PurchaseReceipt"("inquilinoId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_inquilinoId_idempotencyKey_key" ON "PurchaseReceipt"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_inquilinoId_proveedorId_supplierDocumentTyp_key" ON "PurchaseReceipt"("inquilinoId", "proveedorId", "supplierDocumentType", "supplierSeries", "supplierNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_inquilinoId_proveedorId_id_key" ON "PurchaseReceipt"("inquilinoId", "proveedorId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_inquilinoId_id_key" ON "PurchaseReceipt"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "PurchaseReceiptItem_inquilinoId_recepcionCompraId_varianteI_idx" ON "PurchaseReceiptItem"("inquilinoId", "recepcionCompraId", "varianteId");

-- CreateIndex
CREATE INDEX "PurchasePayment_inquilinoId_proveedorId_pagadoEn_idx" ON "PurchasePayment"("inquilinoId", "proveedorId", "pagadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePayment_inquilinoId_idempotencyKey_key" ON "PurchasePayment"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePayment_inquilinoId_id_key" ON "PurchasePayment"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivable_ventaId_key" ON "AccountsReceivable"("ventaId");

-- CreateIndex
CREATE INDEX "AccountsReceivable_inquilinoId_clienteId_estado_venceEn_idx" ON "AccountsReceivable"("inquilinoId", "clienteId", "estado", "venceEn");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivable_inquilinoId_id_key" ON "AccountsReceivable"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivable_inquilinoId_clienteId_ventaId_key" ON "AccountsReceivable"("inquilinoId", "clienteId", "ventaId");

-- CreateIndex
CREATE INDEX "ReceivableInstallment_inquilinoId_estado_venceEn_idx" ON "ReceivableInstallment"("inquilinoId", "estado", "venceEn");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivableInstallment_inquilinoId_receivableId_installmentN_key" ON "ReceivableInstallment"("inquilinoId", "receivableId", "installmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivableInstallment_inquilinoId_id_key" ON "ReceivableInstallment"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "ReceivablePayment_inquilinoId_clienteId_pagadoEn_idx" ON "ReceivablePayment"("inquilinoId", "clienteId", "pagadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivablePayment_inquilinoId_idempotencyKey_key" ON "ReceivablePayment"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivablePayment_inquilinoId_id_key" ON "ReceivablePayment"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "ReceivablePaymentAllocation_inquilinoId_installmentId_idx" ON "ReceivablePaymentAllocation"("inquilinoId", "installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivablePaymentAllocation_inquilinoId_paymentId_installme_key" ON "ReceivablePaymentAllocation"("inquilinoId", "paymentId", "installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_recepcionCompraId_key" ON "AccountsPayable"("recepcionCompraId");

-- CreateIndex
CREATE INDEX "AccountsPayable_inquilinoId_proveedorId_estado_venceEn_idx" ON "AccountsPayable"("inquilinoId", "proveedorId", "estado", "venceEn");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_inquilinoId_id_key" ON "AccountsPayable"("inquilinoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_inquilinoId_proveedorId_recepcionCompraId_key" ON "AccountsPayable"("inquilinoId", "proveedorId", "recepcionCompraId");

-- CreateIndex
CREATE INDEX "PayableInstallment_inquilinoId_estado_venceEn_idx" ON "PayableInstallment"("inquilinoId", "estado", "venceEn");

-- CreateIndex
CREATE UNIQUE INDEX "PayableInstallment_inquilinoId_payableId_installmentNo_key" ON "PayableInstallment"("inquilinoId", "payableId", "installmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "PayableInstallment_inquilinoId_id_key" ON "PayableInstallment"("inquilinoId", "id");

-- CreateIndex
CREATE INDEX "PayablePaymentAllocation_inquilinoId_installmentId_idx" ON "PayablePaymentAllocation"("inquilinoId", "installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PayablePaymentAllocation_inquilinoId_paymentId_installmentI_key" ON "PayablePaymentAllocation"("inquilinoId", "paymentId", "installmentId");

-- CreateIndex
CREATE INDEX "AuditLog_inquilinoId_entityType_entityId_occurredAt_idx" ON "AuditLog"("inquilinoId", "entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_inquilinoId_actorIdentityId_occurredAt_idx" ON "AuditLog"("inquilinoId", "actorIdentityId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_inquilinoId_correlationId_idx" ON "AuditLog"("inquilinoId", "correlationId");

-- CreateIndex
CREATE INDEX "OutboxEvent_publicadoEn_disponibleEn_bloqueadoEn_idx" ON "OutboxEvent"("publicadoEn", "disponibleEn", "bloqueadoEn");

-- CreateIndex
CREATE INDEX "OutboxEvent_inquilinoId_aggregateType_aggregateId_idx" ON "OutboxEvent"("inquilinoId", "aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_inquilinoId_idempotencyKey_key" ON "OutboxEvent"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_inquilinoId_estado_idx" ON "WebhookEndpoint"("inquilinoId", "estado");

-- CreateIndex
CREATE INDEX "WebhookDelivery_inquilinoId_estado_proximoIntentoEn_idx" ON "WebhookDelivery"("inquilinoId", "estado", "proximoIntentoEn");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_inquilinoId_idempotencyKey_key" ON "WebhookDelivery"("inquilinoId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "FileObject_inquilinoId_purpose_creadoEn_idx" ON "FileObject"("inquilinoId", "purpose", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "FileObject_inquilinoId_storageKey_key" ON "FileObject"("inquilinoId", "storageKey");

-- CreateIndex
CREATE INDEX "Notification_inquilinoId_recipientId_estado_creadoEn_idx" ON "Notification"("inquilinoId", "recipientId", "estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Notification_inquilinoId_estado_programadoEn_idx" ON "Notification"("inquilinoId", "estado", "programadoEn");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_inquilinoId_organizacionId_fkey" FOREIGN KEY ("inquilinoId", "organizacionId") REFERENCES "Organization"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_inquilinoId_empresaId_fkey" FOREIGN KEY ("inquilinoId", "empresaId") REFERENCES "Company"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_inquilinoId_sucursalId_fkey" FOREIGN KEY ("inquilinoId", "sucursalId") REFERENCES "Branch"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Terminal" ADD CONSTRAINT "Terminal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Terminal" ADD CONSTRAINT "Terminal_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_inquilinoId_organizacionId_fkey" FOREIGN KEY ("inquilinoId", "organizacionId") REFERENCES "Organization"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_inquilinoId_identidadUsuarioId_fkey" FOREIGN KEY ("inquilinoId", "identidadUsuarioId") REFERENCES "UserIdentity"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessPolicy" ADD CONSTRAINT "AccessPolicy_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLimit" ADD CONSTRAINT "MembershipLimit_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBarcodigo" ADD CONSTRAINT "ProductBarcodigo_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariantTax" ADD CONSTRAINT "ProductVariantTax_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariantTax" ADD CONSTRAINT "ProductVariantTax_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBundleItem" ADD CONSTRAINT "ProductBundleItem_bundleProductId_fkey" FOREIGN KEY ("bundleProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBundleItem" ADD CONSTRAINT "ProductBundleItem_componentVariantId_fkey" FOREIGN KEY ("componentVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_listaPreciosId_fkey" FOREIGN KEY ("listaPreciosId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCreditAccount" ADD CONSTRAINT "CustomerCreditAccount_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_inquilinoId_almacenId_fkey" FOREIGN KEY ("inquilinoId", "almacenId") REFERENCES "Warehouse"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_inquilinoId_loteId_fkey" FOREIGN KEY ("inquilinoId", "loteId") REFERENCES "InventoryLot"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_inquilinoId_serieId_fkey" FOREIGN KEY ("inquilinoId", "serieId") REFERENCES "InventorySerial"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_inquilinoId_almacenId_fkey" FOREIGN KEY ("inquilinoId", "almacenId") REFERENCES "Warehouse"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerial" ADD CONSTRAINT "InventorySerial_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerial" ADD CONSTRAINT "InventorySerial_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_inquilinoId_almacenId_fkey" FOREIGN KEY ("inquilinoId", "almacenId") REFERENCES "Warehouse"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_almacenOrigenId_fkey" FOREIGN KEY ("almacenOrigenId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_almacenDestinoId_fkey" FOREIGN KEY ("almacenDestinoId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransferItem" ADD CONSTRAINT "InventoryTransferItem_inquilinoId_transferId_fkey" FOREIGN KEY ("inquilinoId", "transferId") REFERENCES "InventoryTransfer"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransferItem" ADD CONSTRAINT "InventoryTransferItem_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_inquilinoId_countId_fkey" FOREIGN KEY ("inquilinoId", "countId") REFERENCES "InventoryCount"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_pedidoVentaId_fkey" FOREIGN KEY ("pedidoVentaId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_empresaId_fkey" FOREIGN KEY ("inquilinoId", "empresaId") REFERENCES "Company"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_empresaId_sucursalId_fkey" FOREIGN KEY ("inquilinoId", "empresaId", "sucursalId") REFERENCES "Branch"("inquilinoId", "empresaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_sucursalId_terminalId_fkey" FOREIGN KEY ("inquilinoId", "sucursalId", "terminalId") REFERENCES "Terminal"("inquilinoId", "sucursalId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_sucursalId_sesionCajaId_fkey" FOREIGN KEY ("inquilinoId", "sucursalId", "sesionCajaId") REFERENCES "CashSession"("inquilinoId", "sucursalId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_clienteId_fkey" FOREIGN KEY ("inquilinoId", "clienteId") REFERENCES "Customer"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_inquilinoId_cashierMembershipId_fkey" FOREIGN KEY ("inquilinoId", "cashierMembershipId") REFERENCES "Membership"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_pedidoVentaId_fkey" FOREIGN KEY ("pedidoVentaId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inquilinoId_ventaId_fkey" FOREIGN KEY ("inquilinoId", "ventaId") REFERENCES "Sale"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDiscount" ADD CONSTRAINT "SaleDiscount_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemDiscount" ADD CONSTRAINT "SaleItemDiscount_itemVentaId_fkey" FOREIGN KEY ("itemVentaId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTax" ADD CONSTRAINT "SaleTax_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemTax" ADD CONSTRAINT "SaleItemTax_itemVentaId_fkey" FOREIGN KEY ("itemVentaId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_inquilinoId_ventaId_fkey" FOREIGN KEY ("inquilinoId", "ventaId") REFERENCES "Sale"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_transaccionPagoId_fkey" FOREIGN KEY ("transaccionPagoId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_inquilinoId_ventaId_fkey" FOREIGN KEY ("inquilinoId", "ventaId") REFERENCES "Sale"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefundItem" ADD CONSTRAINT "SaleRefundItem_inquilinoId_ventaId_devolucionVentaId_fkey" FOREIGN KEY ("inquilinoId", "ventaId", "devolucionVentaId") REFERENCES "SaleRefund"("inquilinoId", "ventaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefundItem" ADD CONSTRAINT "SaleRefundItem_inquilinoId_ventaId_itemVentaId_fkey" FOREIGN KEY ("inquilinoId", "ventaId", "itemVentaId") REFERENCES "SaleItem"("inquilinoId", "ventaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReference" ADD CONSTRAINT "SaleReference_sourceSaleId_fkey" FOREIGN KEY ("sourceSaleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReference" ADD CONSTRAINT "SaleReference_targetSaleId_fkey" FOREIGN KEY ("targetSaleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_inquilinoId_sucursalId_fkey" FOREIGN KEY ("inquilinoId", "sucursalId") REFERENCES "Branch"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_inquilinoId_sesionCajaId_fkey" FOREIGN KEY ("inquilinoId", "sesionCajaId") REFERENCES "CashSession"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCount" ADD CONSTRAINT "CashCount_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "CashSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProviderAccount" ADD CONSTRAINT "PaymentProviderAccount_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_cuentaProveedorId_fkey" FOREIGN KEY ("cuentaProveedorId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_intentoPagoId_fkey" FOREIGN KEY ("intentoPagoId") REFERENCES "PaymentIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_transaccionPagoId_fkey" FOREIGN KEY ("transaccionPagoId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_devolucionVentaId_fkey" FOREIGN KEY ("devolucionVentaId") REFERENCES "SaleRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_cuentaProveedorId_fkey" FOREIGN KEY ("cuentaProveedorId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_cuentaProveedorId_fkey" FOREIGN KEY ("cuentaProveedorId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlementItem" ADD CONSTRAINT "PaymentSettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PaymentSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlementItem" ADD CONSTRAINT "PaymentSettlementItem_transaccionPagoId_fkey" FOREIGN KEY ("transaccionPagoId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSeries" ADD CONSTRAINT "DocumentSeries_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SunatCertificate" ADD CONSTRAINT "SunatCertificate_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SunatCertificate" ADD CONSTRAINT "SunatCertificate_certificateFileId_fkey" FOREIGN KEY ("certificateFileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "DocumentSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_xmlFileId_fkey" FOREIGN KEY ("xmlFileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_cdrFileId_fkey" FOREIGN KEY ("cdrFileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentItem" ADD CONSTRAINT "ElectronicDocumentItem_documentoElectronicoId_fkey" FOREIGN KEY ("documentoElectronicoId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentLegend" ADD CONSTRAINT "ElectronicDocumentLegend_documentoElectronicoId_fkey" FOREIGN KEY ("documentoElectronicoId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentCreditInstallment" ADD CONSTRAINT "ElectronicDocumentCreditInstallment_documentoElectronicoId_fkey" FOREIGN KEY ("documentoElectronicoId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicDocumentEvent" ADD CONSTRAINT "ElectronicDocumentEvent_documentoElectronicoId_fkey" FOREIGN KEY ("documentoElectronicoId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_inquilinoId_proveedorId_fkey" FOREIGN KEY ("inquilinoId", "proveedorId") REFERENCES "Supplier"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_inquilinoId_pedidoCompraId_fkey" FOREIGN KEY ("inquilinoId", "pedidoCompraId") REFERENCES "PurchaseOrder"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_inquilinoId_proveedorId_pedidoCompraId_fkey" FOREIGN KEY ("inquilinoId", "proveedorId", "pedidoCompraId") REFERENCES "PurchaseOrder"("inquilinoId", "proveedorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_inquilinoId_almacenId_fkey" FOREIGN KEY ("inquilinoId", "almacenId") REFERENCES "Warehouse"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_inquilinoId_proveedorId_fkey" FOREIGN KEY ("inquilinoId", "proveedorId") REFERENCES "Supplier"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_inquilinoId_recepcionCompraId_fkey" FOREIGN KEY ("inquilinoId", "recepcionCompraId") REFERENCES "PurchaseReceipt"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_inquilinoId_varianteId_fkey" FOREIGN KEY ("inquilinoId", "varianteId") REFERENCES "ProductVariant"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_inquilinoId_proveedorId_fkey" FOREIGN KEY ("inquilinoId", "proveedorId") REFERENCES "Supplier"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_inquilinoId_clienteId_ventaId_fkey" FOREIGN KEY ("inquilinoId", "clienteId", "ventaId") REFERENCES "Sale"("inquilinoId", "clienteId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_inquilinoId_clienteId_fkey" FOREIGN KEY ("inquilinoId", "clienteId") REFERENCES "Customer"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableInstallment" ADD CONSTRAINT "ReceivableInstallment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "AccountsReceivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_inquilinoId_clienteId_fkey" FOREIGN KEY ("inquilinoId", "clienteId") REFERENCES "Customer"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePaymentAllocation" ADD CONSTRAINT "ReceivablePaymentAllocation_inquilinoId_paymentId_fkey" FOREIGN KEY ("inquilinoId", "paymentId") REFERENCES "ReceivablePayment"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePaymentAllocation" ADD CONSTRAINT "ReceivablePaymentAllocation_inquilinoId_installmentId_fkey" FOREIGN KEY ("inquilinoId", "installmentId") REFERENCES "ReceivableInstallment"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_inquilinoId_proveedorId_recepcionCompraId_fkey" FOREIGN KEY ("inquilinoId", "proveedorId", "recepcionCompraId") REFERENCES "PurchaseReceipt"("inquilinoId", "proveedorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable" ADD CONSTRAINT "AccountsPayable_inquilinoId_proveedorId_fkey" FOREIGN KEY ("inquilinoId", "proveedorId") REFERENCES "Supplier"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableInstallment" ADD CONSTRAINT "PayableInstallment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "AccountsPayable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayablePaymentAllocation" ADD CONSTRAINT "PayablePaymentAllocation_inquilinoId_paymentId_fkey" FOREIGN KEY ("inquilinoId", "paymentId") REFERENCES "PurchasePayment"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayablePaymentAllocation" ADD CONSTRAINT "PayablePaymentAllocation_inquilinoId_installmentId_fkey" FOREIGN KEY ("inquilinoId", "installmentId") REFERENCES "PayableInstallment"("inquilinoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
