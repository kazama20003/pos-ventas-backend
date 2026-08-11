import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// Reusa el enum de método de pago de ventas (la firma real de CrearVentaDto).
export enum MetodoPagoComandaDto {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA_BANCARIA = 'TRANSFERENCIA_BANCARIA',
  BILLETERA_DIGITAL = 'BILLETERA_DIGITAL',
  CREDITO_TIENDA = 'CREDITO_TIENDA',
  CREDITO = 'CREDITO',
  OTRO = 'OTRO',
}

// Enums string locales (espejo de los enums del client generado) para @IsEnum.
export enum EstadoMesaDto {
  LIBRE = 'LIBRE',
  OCUPADA = 'OCUPADA',
  CUENTA = 'CUENTA',
  RESERVADA = 'RESERVADA',
  INACTIVA = 'INACTIVA',
}

export enum TipoComandaDto {
  MESA = 'MESA',
  LLEVAR = 'LLEVAR',
  DELIVERY = 'DELIVERY',
}

export enum EstacionCocinaDto {
  COCINA = 'COCINA',
  BARRA = 'BARRA',
  OTRO = 'OTRO',
}

export enum EstadoCocinaItemDto {
  PENDIENTE = 'PENDIENTE',
  EN_PREPARACION = 'EN_PREPARACION',
  LISTO = 'LISTO',
  ENTREGADO = 'ENTREGADO',
  CANCELADO = 'CANCELADO',
}

// ─────────────────────────────── Mesas ──────────────────────────────────────

export class CrearMesaDto {
  @IsUUID()
  sucursalId!: string;

  @IsString()
  codigo!: string;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  zona?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number;

  @IsOptional()
  @IsInt()
  posX?: number;

  @IsOptional()
  @IsInt()
  posY?: number;
}

export class ActualizarMesaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  zona?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number;

  @IsOptional()
  @IsInt()
  posX?: number;

  @IsOptional()
  @IsInt()
  posY?: number;

  @IsOptional()
  @IsEnum(EstadoMesaDto)
  estado?: EstadoMesaDto;
}

// ────────────────────────────── Comandas ────────────────────────────────────

export class AbrirComandaDto {
  @IsUUID()
  sucursalId!: string;

  @IsOptional()
  @IsEnum(TipoComandaDto)
  tipo?: TipoComandaDto;

  @IsOptional()
  @IsUUID()
  mesaId?: string;

  @IsOptional()
  @IsUUID()
  mozoId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  comensales?: number;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class ModificadorDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioExtra?: number;
}

export class AgregarItemDto {
  @IsUUID()
  varianteId!: string;

  @IsPositive()
  cantidad!: number;

  @IsNumber()
  @Min(0)
  precioUnitario!: number;

  @IsString()
  productoNombre!: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsEnum(EstacionCocinaDto)
  estacion?: EstacionCocinaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModificadorDto)
  modificadores?: ModificadorDto[];
}

export class ActualizarCocinaDto {
  @IsEnum(EstadoCocinaItemDto)
  estado!: EstadoCocinaItemDto;
}

// ──────────────────────────────── Cobro ─────────────────────────────────────

export class PagoComandaDto {
  @IsEnum(MetodoPagoComandaDto)
  method!: MetodoPagoComandaDto;

  @IsPositive()
  monto!: number;

  @IsOptional()
  @IsString()
  referencia?: string;
}

export class CobrarComandaDto {
  @IsUUID()
  empresaId!: string;

  @IsUUID()
  serieId!: string;

  @IsOptional()
  @IsUUID()
  sesionCajaId?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  propina?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PagoComandaDto)
  pagos!: PagoComandaDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  itemIds?: string[];
}
