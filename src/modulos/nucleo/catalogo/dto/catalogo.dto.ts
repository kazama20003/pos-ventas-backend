import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export enum TipoProductoDto {
  ESTANDAR = 'ESTANDAR',
  SERVICIO = 'SERVICIO',
  PAQUETE = 'PAQUETE',
}

export enum AfectacionImpuestoDto {
  GRAVADO = 'GRAVADO',
  EXONERADO = 'EXONERADO',
  INAFECTO = 'INAFECTO',
  GRATUITO = 'GRATUITO',
  EXPORTACION = 'EXPORTACION',
}

export enum TipoCodigoBarrasDto {
  EAN13 = 'EAN13',
  EAN8 = 'EAN8',
  UPC_A = 'UPC_A',
  CODIGO128 = 'CODIGO128',
  QR = 'QR',
  PLU = 'PLU',
  INTERNO = 'INTERNO',
}

export class CrearCategoriaDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  padreId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CrearUnidadMedidaDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @Length(3, 3)
  sunatCode!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  decimals?: number;
}

export class CrearImpuestoDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsString()
  sunatTributeCode?: string;

  @IsEnum(AfectacionImpuestoDto)
  affectation!: AfectacionImpuestoDto;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsBoolean()
  includedInPrice?: boolean;
}

export class CodigoBarrasDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsOptional()
  @IsEnum(TipoCodigoBarrasDto)
  tipo?: TipoCodigoBarrasDto;
}

export class CrearVarianteProductoDto {
  @IsUUID()
  unidadMedidaId!: string;

  // Atributos de la variante (talla, color, sabor…). Ej: {"Talla":"M"}.
  @IsOptional()
  atributos?: Record<string, string>;

  // Opcional: si no se envía, el backend lo deriva del código del producto.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cost?: number;

  // Precio de venta al público. Si viene, el backend lo registra en la lista
  // de precios por defecto de la empresa (creándola si no existe).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  precio?: number;

  // Código de barras único (compat). Preferir `barcodes` para múltiples.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  barcode?: string;

  @IsOptional()
  @IsEnum(TipoCodigoBarrasDto)
  barcodeTipo?: TipoCodigoBarrasDto;

  // Múltiples códigos de barras (el primero queda como principal).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodigoBarrasDto)
  barcodes?: CodigoBarrasDto[];

  // Stock inicial (opcional). Requiere que el producto controle inventario.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  stockInicial?: number;

  @IsOptional()
  @IsBoolean()
  isStockTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  impuestoIds?: string[];
}

export class ComponentePaqueteDto {
  @IsUUID()
  varianteId!: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  cantidad!: number;
}

export class CrearProductoDto {
  // Opcional: si no se envía, el backend genera un código único a partir del
  // nombre (p. ej. "Café" → CAFE, y CAFE-2 si ya existe).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoProductoDto)
  kind?: TipoProductoDto;

  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoriaIds?: string[];

  // Almacén donde cargar el stock inicial de las variantes (opcional). Si hay
  // un solo almacén en el inquilino se resuelve solo.
  @IsOptional()
  @IsUUID()
  almacenId?: string;

  // Componentes del combo (solo si kind = PAQUETE).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentePaqueteDto)
  componentes?: ComponentePaqueteDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearVarianteProductoDto)
  variantes!: CrearVarianteProductoDto[];
}

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoProductoDto)
  kind?: TipoProductoDto;

  @IsOptional()
  @IsUUID()
  marcaId?: string;

  // Cadena vacía = quitar marca. `null` no se soporta por el pipe; usar "".
  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoriaIds?: string[];

  // Componentes del combo (kind = PAQUETE). Si se envía, reemplaza el set.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentePaqueteDto)
  componentes?: ComponentePaqueteDto[];

  // Datos de la variante principal (la primera). El panel de producto
  // permite ajustar costo, precio, unidad, impuesto y código de barras.
  @IsOptional()
  @IsUUID()
  unidadMedidaId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsEnum(TipoCodigoBarrasDto)
  barcodeTipo?: TipoCodigoBarrasDto;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  impuestoIds?: string[];
}

export class CrearMarcaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;
}

export class ActualizarMarcaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}

export class ActualizarCategoriaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  padreId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ActualizarVarianteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

  @IsOptional()
  @IsUUID()
  unidadMedidaId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  precio?: number;

  @IsOptional()
  atributos?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  impuestoIds?: string[];
}

export class AgregarCodigoBarrasDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsOptional()
  @IsEnum(TipoCodigoBarrasDto)
  tipo?: TipoCodigoBarrasDto;
}

export class ActualizarUnidadMedidaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  symbol?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  decimals?: number;
}

/**
 * Una fila del CSV de importación. El frontend parsea el archivo y envía JSON.
 * Las referencias (unidad, categoría, marca, impuesto) se resuelven por
 * nombre/código y se crean si no existen.
 */
export class ImportarProductoFilaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  stockInicial?: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  // Nombre o símbolo de la unidad (ej "unidad", "kg", "UND"). Default: unidad.
  @IsOptional()
  @IsString()
  unidad?: string;

  // Nombre de la categoría (se crea si no existe).
  @IsOptional()
  @IsString()
  categoria?: string;

  // Nombre de la marca (se crea si no existe).
  @IsOptional()
  @IsString()
  marca?: string;

  // Código del impuesto existente (ej "IGV"). Si no existe, se ignora.
  @IsOptional()
  @IsString()
  impuesto?: string;
}

export class ListarProductosQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsUUID()
  marcaId?: string;

  // "true"/"false" desde el query string.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  conStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class ImportarProductosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportarProductoFilaDto)
  filas!: ImportarProductoFilaDto[];

  // Almacén para el stock inicial de todas las filas (opcional).
  @IsOptional()
  @IsUUID()
  almacenId?: string;
}

export class ItemListaPreciosDto {
  @IsUUID()
  varianteId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  minQuantity?: number;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  monto!: number;
}

export class CrearListaPreciosDto {
  @IsUUID()
  empresaId!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemListaPreciosDto)
  items!: ItemListaPreciosDto[];
}
