import {
  IsEnum,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

/** Subconjunto de MetodoPago admitido por la pasarela. */
export enum MetodoPasarelaDto {
  TARJETA = 'TARJETA',
  BILLETERA_DIGITAL = 'BILLETERA_DIGITAL',
  TRANSFERENCIA_BANCARIA = 'TRANSFERENCIA_BANCARIA',
  OTRO = 'OTRO',
}

export class RegistrarCuentaProveedorDto {
  @IsUUID()
  empresaId!: string;

  /** Nombre de la pasarela: culqi | mercadopago | … */
  @IsString()
  @MaxLength(40)
  proveedor!: string;

  /** Identificador del comercio en la pasarela (merchant code). */
  @IsString()
  @MaxLength(120)
  referenciaComerciante!: string;

  /** Llave secreta / token (se persiste cifrada por la plataforma). */
  @IsOptional()
  @IsString()
  @MaxLength(400)
  referenciaSecreta?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class CrearIntentoDto {
  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsUUID()
  cuentaProveedorId?: string;

  @IsNumberString()
  monto!: string;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsEnum(MetodoPasarelaDto)
  method!: MetodoPasarelaDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  /** Token de tarjeta / fuente / teléfono de billetera según la pasarela. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fuente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  /** Venta asociada (para conciliar el pago con el POS). */
  @IsOptional()
  @IsUUID()
  ventaId?: string;
}
