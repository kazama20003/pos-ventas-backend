import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export enum MetodoPagoDto {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA_BANCARIA = 'TRANSFERENCIA_BANCARIA',
  BILLETERA_DIGITAL = 'BILLETERA_DIGITAL',
  CREDITO_TIENDA = 'CREDITO_TIENDA',
  CREDITO = 'CREDITO',
  OTRO = 'OTRO',
}

export enum AfectacionImpuestoDto {
  GRAVADO = 'GRAVADO',
  EXONERADO = 'EXONERADO',
  INAFECTO = 'INAFECTO',
  GRATUITO = 'GRATUITO',
  EXPORTACION = 'EXPORTACION',
}

export class ItemVentaDto {
  @IsUUID()
  varianteId!: string;

  @IsUUID()
  almacenId!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  /** Positive quantity. Decimals allowed (e.g. weighed goods). */
  @IsPositive()
  cantidad!: number;

  /** Final unit price in the sale currency. */
  @Min(0)
  precioUnitario!: number;

  @IsEnum(AfectacionImpuestoDto)
  afectacionImpuesto!: AfectacionImpuestoDto;
}

export class PagoVentaDto {
  @IsEnum(MetodoPagoDto)
  method!: MetodoPagoDto;

  @IsPositive()
  monto!: number;

  @IsOptional()
  @IsString()
  referencia?: string;
}

export class CrearVentaDto {
  @IsUUID()
  empresaId!: string;

  @IsUUID()
  sucursalId!: string;

  /** DocumentSeries used to reserve the correlative sale number. */
  @IsUUID()
  serieId!: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsString()
  @Length(3, 3)
  moneda!: string;

  /** Client-generated key that makes retries safe (offline sync, timeouts). */
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items!: ItemVentaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoVentaDto)
  pagos?: PagoVentaDto[];

  @IsOptional()
  @IsInt()
  offlineCreatedAtMs?: number;

  @IsOptional()
  @IsString()
  offlineDeviceId?: string;

  @IsOptional()
  @IsString()
  offlineId?: string;
}
