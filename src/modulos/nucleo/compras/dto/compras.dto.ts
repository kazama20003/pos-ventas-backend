import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MetodoCobroDto } from '../../clientes/dto/clientes.dto';

export class ItemOrdenCompraDto {
  @IsString()
  varianteId!: string;

  @IsString()
  @MaxLength(250)
  descripcion!: string;

  @IsPositive()
  cantidad!: number;

  @IsNumberString()
  costoUnitario!: string;

  @IsOptional()
  @IsNumberString()
  montoImpuesto?: string;
}

export class CrearOrdenCompraDto {
  @IsString()
  sucursalId!: string;

  @IsString()
  proveedorId!: string;

  @IsString()
  @MaxLength(30)
  number!: string;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenCompraDto)
  items!: ItemOrdenCompraDto[];
}

export class ItemRecepcionDto {
  @IsString()
  varianteId!: string;

  @IsPositive()
  cantidad!: number;

  @IsNumberString()
  costoUnitario!: string;

  @IsOptional()
  @IsNumberString()
  montoImpuesto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  venceEn?: string;
}

export class RecepcionarDto {
  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  pedidoCompraId?: string;

  @IsString()
  almacenId!: string;

  @IsString()
  proveedorId!: string;

  @IsString()
  @MaxLength(40)
  number!: string;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  supplierDocumentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  supplierSeries?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  supplierNumber?: string;

  /** Si true, genera una cuenta por pagar a crédito por el total. */
  @IsOptional()
  @IsBoolean()
  aCredito?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasCredito?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemRecepcionDto)
  items!: ItemRecepcionDto[];
}

export class AsignacionPagoDto {
  @IsString()
  cuotaId!: string;

  @IsNumberString()
  monto!: string;
}

export class PagarProveedorDto {
  @IsString()
  proveedorId!: string;

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
  @Type(() => AsignacionPagoDto)
  asignaciones!: AsignacionPagoDto[];
}
