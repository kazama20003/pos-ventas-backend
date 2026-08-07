import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum TipoBeneficioPromocionDto {
  PORCENTAJE = 'PORCENTAJE',
  MONTO_FIJO = 'MONTO_FIJO',
  PRECIO_FIJO = 'PRECIO_FIJO',
  LLEVA_N_PAGA_M = 'LLEVA_N_PAGA_M',
}

export class CrearPromocionDto {
  @IsUUID()
  empresaId!: string;

  @IsString()
  @MaxLength(40)
  codigo!: string;

  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsEnum(TipoBeneficioPromocionDto)
  tipoBeneficio!: TipoBeneficioPromocionDto;

  /** % (PORCENTAJE), monto por unidad (MONTO_FIJO) o precio de oferta (PRECIO_FIJO). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  valor?: number;

  /** N en "lleva N paga M". */
  @IsOptional()
  @IsInt()
  @Min(1)
  compraCantidad?: number;

  /** M en "lleva N paga M". */
  @IsOptional()
  @IsInt()
  @Min(0)
  pagaCantidad?: number;

  @IsISO8601()
  iniciaEn!: string;

  @IsOptional()
  @IsISO8601()
  terminaEn?: string;

  @IsOptional()
  @IsInt()
  prioridad?: number;

  @IsOptional()
  @IsBoolean()
  acumulable?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cantidadMinima?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoMinimoVenta?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usoMaximo?: number;

  /** Productos alcanzados por la promoción (fase 1: alcance PRODUCTO). */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  productoIds!: string[];
}

export class ActualizarPromocionDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoBeneficioPromocionDto)
  tipoBeneficio?: TipoBeneficioPromocionDto;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  compraCantidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pagaCantidad?: number;

  @IsOptional()
  @IsISO8601()
  iniciaEn?: string;

  @IsOptional()
  @IsISO8601()
  terminaEn?: string;

  @IsOptional()
  @IsInt()
  prioridad?: number;

  @IsOptional()
  @IsBoolean()
  acumulable?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cantidadMinima?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoMinimoVenta?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usoMaximo?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  productoIds?: string[];
}

export enum EstadoPromocionDto {
  PROGRAMADA = 'PROGRAMADA',
  ACTIVA = 'ACTIVA',
  PAUSADA = 'PAUSADA',
  EXPIRADA = 'EXPIRADA',
}

export class CambiarEstadoPromocionDto {
  @IsEnum(EstadoPromocionDto)
  estado!: EstadoPromocionDto;
}

export class ListarPromocionesDto {
  @IsUUID()
  empresaId!: string;

  @IsOptional()
  @IsEnum(EstadoPromocionDto)
  estado?: EstadoPromocionDto;

  @IsOptional()
  @IsString()
  q?: string;

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

export class ItemCarritoDto {
  @IsUUID()
  varianteId!: string;

  @IsPositive()
  cantidad!: number;
}

/** Solicita las promociones aplicables a un carrito (vista previa de caja). */
export class PromocionesAplicablesDto {
  @IsUUID()
  sucursalId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemCarritoDto)
  items!: ItemCarritoDto[];
}
