import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConteoDenominacionDto {
  /** Value of the bill/coin, e.g. 100.00, 0.50. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  denominacion!: number;

  @IsInt()
  @Min(0)
  cantidad!: number;
}

export class CerrarCajaDto {
  @IsUUID()
  sesionCajaId!: string;

  /** Cash physically counted in the drawer at close. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoDeclarado!: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  motivo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConteoDenominacionDto)
  conteos?: ConteoDenominacionDto[];
}
