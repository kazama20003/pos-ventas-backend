import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum ConfiguracionInicialDto {
  RAPIDA = 'RAPIDA',
  MANUAL = 'MANUAL',
}

export class RegistrarEmpresaDto {
  /** Google ID token of the person registering (becomes owner/admin). */
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  /**
   * Optional preferred tenant code (login/URL slug). If omitted we derive a
   * unique slug from the company name. If provided it is slugified and made
   * unique too, so collisions never happen.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,40}$/, {
    message: 'tenantCodigo: 3-40 caracteres alfanuméricos, guion o guion bajo',
  })
  tenantCodigo?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  tenantNombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organizacionNombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  empresaRazonSocial!: string;

  /** Peruvian RUC: 11 digits. */
  @IsString()
  @Length(11, 11)
  @Matches(/^\d{11}$/, { message: 'empresaRuc debe ser 11 dígitos' })
  empresaRuc!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  adminNombre?: string;

  /** La configuración rápida crea sucursal, almacén y caja iniciales. */
  @IsOptional()
  @IsEnum(ConfiguracionInicialDto)
  configuracionInicial?: ConfiguracionInicialDto;

  /** Nombre de la primera sucursal creada durante la configuración rápida. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  sucursalNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  sucursalDireccion?: string;

  /** Nombre del almacén principal creado durante la configuración rápida. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  almacenNombre?: string;

  /** Nombre de la caja inicial creada durante la configuración rápida. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  cajaNombre?: string;
}
