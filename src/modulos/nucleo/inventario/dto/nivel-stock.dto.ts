import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

/** Define el punto de reorden (mínimo) y nivel objetivo (máximo) de un ítem. */
export class DefinirNivelStockDto {
  @IsUUID()
  almacenId!: string;

  @IsUUID()
  varianteId!: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  stockMinimo!: number;

  // 0 = sin nivel objetivo (la sugerencia usa solo el mínimo).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  stockMaximo?: number;
}
