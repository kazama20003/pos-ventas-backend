import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RegistrarStockInicialDto {
  @IsUUID()
  almacenId!: string;

  @IsUUID()
  varianteId!: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  cantidad!: number;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  costoUnitario!: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
