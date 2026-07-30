import {
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConsumirTenantCreadoDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  inquilinoId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  eventType!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => TenantCreadoCarga)
  carga!: TenantCreadoCarga;
}

export class TenantCreadoCarga {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombreVisible!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razonSocial!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  region!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  timezone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  locale!: string;
}
