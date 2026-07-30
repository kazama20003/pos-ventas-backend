import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CrearNotificacionDto {
  /** Destinatario (identidad de usuario). */
  @IsUUID()
  recipientId!: string;

  /** Canal: in_app | email | sms | … */
  @IsString()
  @MaxLength(40)
  channel!: string;

  @IsString()
  @MaxLength(120)
  templateKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsObject()
  carga!: Record<string, unknown>;
}
