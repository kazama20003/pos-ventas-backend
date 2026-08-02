import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CrearEmpresaDto {
  @IsUUID()
  organizacionId!: string;

  @IsString()
  @MaxLength(200)
  razonSocial!: string;

  @Matches(/^\d{11}$/, { message: 'El RUC debe tener 11 dígitos' })
  ruc!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreComercial?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  sunatUbigeo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  fiscalAddress?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;
}

export class ActualizarEmpresaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreComercial?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  sunatUbigeo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  fiscalAddress?: string;
}
