import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

/** Solicita una URL prefirmada para subir un archivo directo al object storage. */
export class PresignSubidaDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  // Solo imágenes por ahora (image/png, image/jpeg, image/webp…).
  @IsString()
  @Matches(/^image\/(png|jpe?g|webp|gif|avif)$/i, {
    message: 'Tipo de imagen no soportado',
  })
  contentType!: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

/**
 * Confirma la subida: el cliente ya subió el archivo y envía su tamaño y hash.
 * Recién aquí se crea el FileObject (que exige byteSize y checksum).
 */
export class ConfirmarSubidaDto {
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsInt()
  @Min(1)
  byteSize!: number;

  @IsString()
  @IsNotEmpty()
  checksumSha256!: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
