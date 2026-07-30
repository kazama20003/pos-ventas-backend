import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Mirrors Prisma enum TipoCliente. */
export enum TipoClienteDto {
  PERSONA = 'PERSONA',
  EMPRESA = 'EMPRESA',
}

/** Mirrors Prisma enum TipoDocumentoIdentidad. */
export enum TipoDocumentoDto {
  DNI = 'DNI',
  RUC = 'RUC',
  CE = 'CE',
  PASAPORTE = 'PASAPORTE',
  ID_TRIBUTARIO_EXTRANJERO = 'ID_TRIBUTARIO_EXTRANJERO',
  OTRO = 'OTRO',
}

export enum MetodoCobroDto {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA_BANCARIA = 'TRANSFERENCIA_BANCARIA',
  BILLETERA_DIGITAL = 'BILLETERA_DIGITAL',
  OTRO = 'OTRO',
}

export class CrearClienteDto {
  @IsString()
  @MaxLength(30)
  codigo!: string;

  @IsEnum(TipoClienteDto)
  tipo!: TipoClienteDto;

  @IsOptional()
  @IsEnum(TipoDocumentoDto)
  documentType?: TipoDocumentoDto;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  documentNumber?: string;

  @IsString()
  @MaxLength(200)
  razonSocial!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreComercial?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;
}

export class ActualizarClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreComercial?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class CuentaCreditoDto {
  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsNumberString()
  creditLimit!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermDays?: number;
}

export class AsignacionCobroDto {
  @IsUUID()
  cuotaId!: string;

  @IsNumberString()
  monto!: string;
}

export class RegistrarCobroDto {
  @IsUUID()
  clienteId!: string;

  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsEnum(MetodoCobroDto)
  method!: MetodoCobroDto;

  @IsPositive()
  monto!: number;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referencia?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AsignacionCobroDto)
  asignaciones!: AsignacionCobroDto[];
}
