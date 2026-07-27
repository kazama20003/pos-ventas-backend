import { IsNotEmpty, IsString } from 'class-validator';

export class LoginGoogleDto {
  /** Google ID token obtained by the client after Google sign-in. */
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  /** Company the user is signing into (an email may belong to several). */
  @IsString()
  @IsNotEmpty()
  tenantCodigo!: string;
}
