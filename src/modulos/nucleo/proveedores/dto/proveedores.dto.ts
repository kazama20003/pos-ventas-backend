import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoDocumentoDto } from '../../clientes/dto/clientes.dto';

export class CrearProveedorDto {
  @IsString()
  @MaxLength(30)
  codigo!: string;

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
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermDays?: number;
}

/** Vincula una variante a un proveedor (catálogo de aprovisionamiento). */
export class VincularProductoProveedorDto {
  @IsUUID()
  varianteId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  supplierSku?: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  costo!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  minOrderQty?: number;

  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}

/** Ajusta un vínculo producto↔proveedor existente. */
export class ActualizarProductoProveedorDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  supplierSku?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  minOrderQty?: number;

  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}

export class ActualizarProveedorDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermDays?: number;
}
