import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/** Retiene stock disponible de una variante en un almacén para un pedido. */
export class CrearReservaDto {
  @IsUUID()
  almacenId!: string;

  @IsUUID()
  varianteId!: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  cantidad!: number;

  /** Etiqueta libre del motivo/pedido (se guarda como referenciaType). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  referencia?: string;

  /** Vencimiento opcional de la reserva (ISO). */
  @IsOptional()
  @IsDateString()
  venceEn?: string;
}
