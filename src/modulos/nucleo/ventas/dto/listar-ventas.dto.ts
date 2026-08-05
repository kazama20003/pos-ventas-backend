import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Estados de venta admitidos como filtro (reflejan el enum EstadoVenta). */
export enum EstadoVentaFiltro {
  BORRADOR = 'BORRADOR',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  PAGADA_PARCIALMENTE = 'PAGADA_PARCIALMENTE',
  PAGADA = 'PAGADA',
  COMPLETADA = 'COMPLETADA',
  ANULADA = 'ANULADA',
  DEVUELTA_PARCIALMENTE = 'DEVUELTA_PARCIALMENTE',
  DEVUELTA = 'DEVUELTA',
  VENCIDA = 'VENCIDA',
}

export class ListarVentasDto {
  /** Sucursal cuyas ventas se listan (obligatoria: acota el permiso y el índice). */
  @IsUUID()
  sucursalId!: string;

  @IsOptional()
  @IsEnum(EstadoVentaFiltro)
  estado?: EstadoVentaFiltro;

  /** Cajero (membresía) que registró la venta. */
  @IsOptional()
  @IsUUID()
  cajeroId?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  /** Rango por fecha de creación (ISO-8601). `hasta` es inclusivo del día. */
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @IsOptional()
  @IsISO8601()
  hasta?: string;

  /** Búsqueda por número de comprobante o razón social del cliente. */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
