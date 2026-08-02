import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export enum IntervaloDto {
  UNICO = 'UNICO',
  DIA = 'DIA',
  SEMANA = 'SEMANA',
  MES = 'MES',
  ANIO = 'ANIO',
}

export enum PeriodoUsoDto {
  HORA = 'HORA',
  DIA = 'DIA',
  MES = 'MES',
  PERIODO_FACTURACION = 'PERIODO_FACTURACION',
}

export class CrearPlanDto {
  @IsString()
  @MaxLength(40)
  codigo!: string;

  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  descripcion?: string;
}

export class CrearVersionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;
}

export class AsignarFeatureDto {
  @IsUUID()
  caracteristicaId!: string;

  /** Límite numérico del entitlement (ej. máximo de sucursales). */
  @IsOptional()
  @IsNumberString()
  limitValue?: string;

  /** Valor textual/entero cuando la característica no es un límite numérico. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  valor?: string;

  @IsOptional()
  @IsEnum(PeriodoUsoDto)
  resetPeriod?: PeriodoUsoDto;
}

export class DefinirPrecioDto {
  @IsString()
  @MaxLength(60)
  codigo!: string;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsNumberString()
  unitAmount!: string;

  @IsEnum(IntervaloDto)
  interval!: IntervaloDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalCount?: number;

  @IsOptional()
  @IsNumberString()
  includedQuantity?: string;
}
