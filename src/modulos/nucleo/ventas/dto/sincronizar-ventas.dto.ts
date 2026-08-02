import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CrearVentaDto } from './crear-venta.dto';

/**
 * Lote de ventas creadas offline en un terminal, enviadas al reconectar. Cada
 * venta se procesa de forma independiente e idempotente (por idempotencyKey), de
 * modo que reenvíos y fallos parciales no duplican ni abortan el lote.
 */
export class SincronizarVentasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearVentaDto)
  ventas!: CrearVentaDto[];
}
