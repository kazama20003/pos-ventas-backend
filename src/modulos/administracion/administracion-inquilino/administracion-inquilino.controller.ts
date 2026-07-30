import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RequierePermiso, Usuario } from '../../nucleo/identidad/decoradores';
import { UsuarioAutenticado } from '../../nucleo/identidad/autenticacion.tipos';
import { ConsumirTenantCreadoDto } from './dto/consumir-tenant-creado.dto';
import { TenantAdministrationService } from './administracion-inquilino.service';

@Controller('administracion/interna/eventos')
export class TenantAdministrationController {
  constructor(private readonly administracion: TenantAdministrationService) {}

  @Post('tenant-creado')
  @HttpCode(200)
  @RequierePermiso('roles.asignar')
  consumirTenantCreado(
    @Body() evento: ConsumirTenantCreadoDto,
    @Usuario() usuario: UsuarioAutenticado,
  ) {
    return this.administracion.consumirTenantCreado(
      evento,
      usuario.inquilinoId,
    );
  }
}
