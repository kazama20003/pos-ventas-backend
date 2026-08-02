import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Mirrors Prisma enum TipoValorCaracteristica. */
export enum TipoValorDto {
  BOOLEANO = 'BOOLEANO',
  ENTERO = 'ENTERO',
  DECIMAL = 'DECIMAL',
  TEXTO = 'TEXTO',
}

export class CrearCaracteristicaDto {
  @IsString()
  @MaxLength(80)
  clave!: string;

  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoValorDto)
  valorType?: TipoValorDto;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;
}

export class ActualizarCaracteristicaDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
