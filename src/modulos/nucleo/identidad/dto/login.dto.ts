import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  tenantCodigo!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
