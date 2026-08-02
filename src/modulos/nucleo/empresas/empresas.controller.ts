import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { ActualizarEmpresaDto, CrearEmpresaDto } from './dto/empresas.dto';
import { EmpresasService } from './empresas.service';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @RequierePermiso('empresas.gestionar')
  @Post()
  crear(@Body() dto: CrearEmpresaDto) {
    return this.empresas.crear(dto);
  }

  @RequierePermiso('empresas.leer')
  @Get()
  listar() {
    return this.empresas.listar();
  }

  @RequierePermiso('empresas.leer')
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresas.obtener(id);
  }

  @RequierePermiso('empresas.gestionar')
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEmpresaDto,
  ) {
    return this.empresas.actualizar(id, dto);
  }
}
