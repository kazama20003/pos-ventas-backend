import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CrearConteoDto {
  @IsUUID()
  almacenId!: string;
}

export class ConteoItemDto {
  @IsUUID()
  varianteId!: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cantidadContada!: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class RegistrarConteoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConteoItemDto)
  articulos!: ConteoItemDto[];
}
