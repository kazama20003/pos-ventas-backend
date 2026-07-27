import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { UsuarioAutenticado } from './autenticacion.tipos';
import { Publico, Usuario } from './decoradores';
import { LoginGoogleDto } from './dto/login.dto';
import { RefrescarDto } from './dto/refrescar.dto';

@Controller('identidad/auth')
export class AutenticacionController {
  constructor(private readonly auth: AutenticacionService) {}

  @Publico()
  @Post('google')
  @HttpCode(200)
  loginGoogle(@Body() dto: LoginGoogleDto) {
    return this.auth.loginGoogle(dto.idToken, dto.tenantCodigo);
  }

  @Publico()
  @Post('refrescar')
  @HttpCode(200)
  refrescar(@Body() dto: RefrescarDto) {
    return this.auth.refrescar(dto.refreshToken);
  }

  @Get('perfil')
  perfil(@Usuario() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
