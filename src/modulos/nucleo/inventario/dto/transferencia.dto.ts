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

export class CrearTransferenciaItemDto {
  @IsUUID()
  varianteId!: string;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  cantidad!: number;
}

export class CrearTransferenciaDto {
  @IsUUID()
  almacenOrigenId!: string;

  @IsUUID()
  almacenDestinoId!: string;

  @IsOptional()
  @IsString()
  notas?: string;

  // Clave de idempotencia para evitar envíos duplicados desde la UI.
  @IsString()
  idempotencyKey!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearTransferenciaItemDto)
  articulos!: CrearTransferenciaItemDto[];
}

export class RecibirTransferenciaItemDto {
  @IsUUID()
  varianteId!: string;

  // Cantidad efectivamente recibida (puede ser menor a la enviada).
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  cantidad!: number;
}

export class RecibirTransferenciaDto {
  @IsString()
  idempotencyKey!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecibirTransferenciaItemDto)
  articulos!: RecibirTransferenciaItemDto[];
}
