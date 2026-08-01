import { IsIn, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';

export const TIPOS_DOCUMENTO = [
  'FACTURA',
  'BOLETA',
  'NOTA_CREDITO',
  'NOTA_DEBITO',
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export class CrearSerieDto {
  @IsUUID()
  empresaId!: string;

  @IsOptional()
  @IsUUID()
  sucursalId?: string;

  @IsIn(TIPOS_DOCUMENTO)
  documentType!: TipoDocumento;

  /** Serie SUNAT: letra + alfanumérico, p. ej. B001, F001, BC01. */
  @Matches(/^[A-Z][A-Z0-9]{1,7}$/, {
    message: 'La serie debe ser mayúsculas/números, p. ej. B001 o F001.',
  })
  series!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;
}
