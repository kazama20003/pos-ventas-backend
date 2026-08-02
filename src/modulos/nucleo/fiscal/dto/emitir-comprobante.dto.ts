import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Fiscal document type the caller may force; otherwise auto-detected. */
export enum TipoComprobanteDto {
  FACTURA = 'FACTURA',
  BOLETA = 'BOLETA',
}

export class EmitirComprobanteDto {
  /** Sale to invoice. Must be a settled (non-void) sale of this tenant. */
  @IsUUID()
  ventaId!: string;

  /** DocumentSeries (electronic) to draw the correlative from, e.g. F001/B001. */
  @IsUUID()
  serieId!: string;

  /** Force FACTURA/BOLETA. Omit to auto-detect from the customer's document. */
  @IsOptional()
  @IsIn([TipoComprobanteDto.FACTURA, TipoComprobanteDto.BOLETA])
  tipoComprobante?: TipoComprobanteDto;

  /** Client-supplied idempotency key; defaults to `emitir:<ventaId>:<serieId>`. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
