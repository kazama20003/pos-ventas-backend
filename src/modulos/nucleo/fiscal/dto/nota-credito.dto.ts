import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class NotaCreditoDto {
  /** Accepted electronic document being corrected/annulled. */
  @IsUUID()
  documentoOrigenId!: string;

  /** DocumentSeries (NOTA_CREDITO type) to draw the correlative from. */
  @IsUUID()
  serieId!: string;

  /** SUNAT Catálogo 09 credit-note reason code, e.g. "01" (anulación). */
  @IsString()
  @MaxLength(2)
  motivoCodigo!: string;

  @IsString()
  @MaxLength(250)
  motivoTexto!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
