import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearUsuarioDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nombreVisible!: string;

  /** Organization within the tenant the membership belongs to. */
  @IsUUID()
  organizacionId!: string;

  /** Roles granted to the new membership. */
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  rolIds!: string[];
}

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nombreVisible?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  rolIds?: string[];
}

export class CambiarEstadoUsuarioDto {
  @IsIn(['ACTIVA', 'SUSPENDIDA', 'REVOCADA'])
  estado!: 'ACTIVA' | 'SUSPENDIDA' | 'REVOCADA';
}
