import { Type } from 'class-transformer';
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

export class CrearVarianteProductoDto {
  @IsUUID()
  unidadMedidaId!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cost?: number;

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

export class CrearProductoDto {
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
  @IsEnum(TipoProductoDto)
  kind?: TipoProductoDto;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoriaIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearVarianteProductoDto)
  variantes!: CrearVarianteProductoDto[];
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
