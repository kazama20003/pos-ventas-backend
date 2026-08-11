import { IsIn } from 'class-validator';

/** Override manual de un paso del onboarding contextual. */
export class ActualizarPasoOnboardingDto {
  @IsIn(['PENDIENTE', 'OMITIDO', 'DESCARTADO'])
  status!: 'PENDIENTE' | 'OMITIDO' | 'DESCARTADO';
}
