import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export enum TipoAlmacenDto {
  PRINCIPAL = 'PRINCIPAL',
  TRANSITO = 'TRANSITO',
  MERMA = 'MERMA',
  DEVOLUCIONES = 'DEVOLUCIONES',
}

export class CrearSucursalDto {
  @IsUUID()
  empresaId!: string;

  @IsString()
  @MaxLength(30)
  codigo!: string;

  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  sunatUbigeo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class CrearAlmacenDto {
  @IsUUID()
  sucursalId!: string;

  @IsString()
  @MaxLength(30)
  codigo!: string;

  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsEnum(TipoAlmacenDto)
  tipo?: TipoAlmacenDto;
}

export class CrearCajaDto {
  @IsUUID()
  sucursalId!: string;

  @IsString()
  @MaxLength(30)
  codigo!: string;

  @IsString()
  @MaxLength(160)
  nombre!: string;
}

export class ActualizarSucursalDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  sunatUbigeo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class ActualizarAlmacenDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsEnum(TipoAlmacenDto)
  tipo?: TipoAlmacenDto;
}

export class ActualizarCajaDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombre?: string;
}
