import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginGoogleDto {
  /** Google ID token obtained by the client after Google sign-in. */
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  /**
   * Optional. If omitted, the tenant is auto-detected from the email. Required
   * only when the email belongs to more than one company (disambiguation).
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantCodigo?: string;
}
