import { IsJWT } from 'class-validator';

export class RefrescarDto {
  @IsJWT()
  refreshToken!: string;
}
