import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

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
