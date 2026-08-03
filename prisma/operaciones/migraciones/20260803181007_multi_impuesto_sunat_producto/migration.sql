-- CreateEnum
CREATE TYPE "TipoCalculoImpuesto" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- CreateEnum
CREATE TYPE "TipoTributo" AS ENUM ('IGV', 'ISC', 'ICBPER', 'EXONERADO', 'INAFECTO', 'EXPORTACION', 'GRATUITO', 'OTRO');

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "sunatProductCode" TEXT;

-- AlterTable
ALTER TABLE "Tax" ADD COLUMN     "tipoCalculo" "TipoCalculoImpuesto" NOT NULL DEFAULT 'PORCENTAJE',
ADD COLUMN     "tipoTributo" "TipoTributo" NOT NULL DEFAULT 'IGV';
