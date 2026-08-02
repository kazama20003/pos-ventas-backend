import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearCuentaFacturacionDto {
  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  billingEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermsDays?: number;
}

export class GenerarFacturaDto {
  @IsUUID()
  suscripcionId!: string;
}

export class RegistrarPagoDto {
  @IsUUID()
  facturaId!: string;

  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsNumberString()
  monto!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  proveedor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referencia?: string;
}
