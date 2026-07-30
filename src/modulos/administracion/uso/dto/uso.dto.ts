import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum AgregacionDto {
  SUMA = 'SUMA',
  CONTEO = 'CONTEO',
  MAXIMO = 'MAXIMO',
  ULTIMO = 'ULTIMO',
  UNICO = 'UNICO',
}

export enum PeriodoDto {
  HORA = 'HORA',
  DIA = 'DIA',
  MES = 'MES',
  PERIODO_FACTURACION = 'PERIODO_FACTURACION',
}

export class CrearMedidorDto {
  @IsString()
  @MaxLength(80)
  clave!: string;

  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsEnum(AgregacionDto)
  aggregation!: AgregacionDto;

  @IsString()
  @MaxLength(40)
  unit!: string;

  @IsEnum(PeriodoDto)
  period!: PeriodoDto;

  @IsOptional()
  @IsString()
  caracteristicaId?: string;
}

export class RegistrarUsoDto {
  @IsString()
  @MaxLength(80)
  medidorClave!: string;

  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsNumberString()
  cantidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subjectId?: string;
}
