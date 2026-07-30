import {
  ArrayNotEmpty,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class RegistrarEndpointDto {
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  url!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  eventosSuscritos!: string[];

  /** Secreto para firmar (HMAC). Si se omite, se genera uno. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  signingSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;
}

export class EmitirEventoDto {
  @IsString()
  @MaxLength(120)
  eventType!: string;

  @IsObject()
  carga!: Record<string, unknown>;
}
