import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarEmpresaDto {
  /** Google ID token of the person registering (becomes owner/admin). */
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  /** Unique tenant code used at login and in URLs. */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,40}$/, {
    message: 'tenantCodigo: 3-40 caracteres alfanuméricos, guion o guion bajo',
  })
  tenantCodigo!: string;

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
}
