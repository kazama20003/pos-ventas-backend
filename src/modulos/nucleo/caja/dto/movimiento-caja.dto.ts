import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Movimientos manuales de efectivo permitidos desde la UI de caja. */
export const TIPOS_MOVIMIENTO_MANUAL = [
  'INGRESO_EFECTIVO',
  'EGRESO_EFECTIVO',
  'RETIRO',
] as const;

export type TipoMovimientoManual = (typeof TIPOS_MOVIMIENTO_MANUAL)[number];

export class MovimientoCajaDto {
  @IsUUID()
  sesionCajaId!: string;

  @IsIn(TIPOS_MOVIMIENTO_MANUAL)
  tipo!: TipoMovimientoManual;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto!: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  motivo?: string;
}
