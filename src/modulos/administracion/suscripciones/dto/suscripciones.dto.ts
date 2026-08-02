import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class SuscribirDto {
  /** Versión de plan (ACTIVA) a la que se suscribe el tenant. */
  @IsUUID()
  versionPlanId!: string;
}

export class CambiarPlanDto {
  @IsUUID()
  versionPlanId!: string;
}

export class CancelarSuscripcionDto {
  /** Si true, cancela al final del período actual; si no, de inmediato. */
  @IsOptional()
  @IsBoolean()
  alFinalDePeriodo?: boolean;
}
