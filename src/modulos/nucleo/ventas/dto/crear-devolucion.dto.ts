import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ItemDevolucionDto {
  /** SaleItem being (partially) returned. */
  @IsUUID()
  itemVentaId!: string;

  /**
   * Almacén al que regresa el stock (si restock). Opcional: si se omite, se usa
   * el almacén predeterminado de la sucursal de la venta.
   */
  @IsOptional()
  @IsUUID()
  almacenId?: string;

  @IsPositive()
  cantidad!: number;

  /** If false, the goods are scrapped and stock is NOT incremented. */
  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

export class CrearDevolucionDto {
  @IsUUID()
  ventaId!: string;

  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsString()
  @MaxLength(40)
  number!: string;

  @IsString()
  @MaxLength(250)
  motivo!: string;

  /** If true and a cash session is given, refunds cash from the drawer. */
  @IsOptional()
  @IsBoolean()
  devolverEfectivo?: boolean;

  @IsOptional()
  @IsUUID()
  sesionCajaId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDevolucionDto)
  items!: ItemDevolucionDto[];
}
