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

export class ItemVentaDto {
  @IsUUID()
  varianteId!: string;

  /**
   * Almacén del que se descuenta el stock. Opcional: si se omite, el backend
   * usa el almacén predeterminado de la sucursal de la venta.
   */
  @IsOptional()
  @IsUUID()
  almacenId?: string;

  /** Positive quantity. Decimals allowed (e.g. weighed goods). */
  @IsPositive()
  cantidad!: number;
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
  sesionCajaId?: string;

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
