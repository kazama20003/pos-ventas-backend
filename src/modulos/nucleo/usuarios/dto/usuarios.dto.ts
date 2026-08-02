import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';

/**
 * Asignación de un rol a una membresía, opcionalmente acotada a una sucursal.
 * `sucursalId` ausente/null = el rol aplica en TODAS las sucursales (global).
 */
export class AsignacionRolDto {
  @IsUUID()
  rolId!: string;

  @IsOptional()
  @IsUUID()
  sucursalId?: string;
}

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

  /**
   * Roles globales (compat). Usa `roles` para acotar por sucursal.
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  rolIds?: string[];

  /** Roles con sucursal opcional. Tiene prioridad sobre `rolIds`. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignacionRolDto)
  roles?: AsignacionRolDto[];
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignacionRolDto)
  roles?: AsignacionRolDto[];
}

export class CambiarEstadoUsuarioDto {
  @IsIn(['ACTIVA', 'SUSPENDIDA', 'REVOCADA'])
  estado!: 'ACTIVA' | 'SUSPENDIDA' | 'REVOCADA';
}
