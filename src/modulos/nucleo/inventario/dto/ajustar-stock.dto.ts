import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum TipoAjusteStock {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
}

export class AjustarStockDto {
  @IsUUID()
  almacenId!: string;

  @IsUUID()
  varianteId!: string;

  @IsEnum(TipoAjusteStock)
  tipo!: TipoAjusteStock;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  cantidad!: number;

  // Solo aplica a ENTRADA: recalcula el costo promedio. Opcional.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  costoUnitario?: number;

  // Motivo del ajuste (merma, conteo, robo…). Se guarda en el asiento.
  @IsOptional()
  @IsString()
  motivo?: string;
}
