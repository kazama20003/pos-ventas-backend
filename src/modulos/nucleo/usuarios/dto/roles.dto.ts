import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearRolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  codigo!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  descripcion?: string;

  /** Permission keys from the catalog to grant to this role. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permisos?: string[];
}

export class AsignarPermisosDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permisos!: string[];
}
