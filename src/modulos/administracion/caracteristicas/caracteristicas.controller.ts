import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequierePermiso } from '../../nucleo/identidad/decoradores';
import {
  ActualizarCaracteristicaDto,
  CrearCaracteristicaDto,
} from './dto/caracteristicas.dto';
import { CaracteristicasService } from './caracteristicas.service';

@Controller('plataforma/caracteristicas')
export class CaracteristicasController {
  constructor(private readonly caracteristicas: CaracteristicasService) {}

  @RequierePermiso('plataforma.gestionar')
  @Post()
  crear(@Body() dto: CrearCaracteristicaDto) {
    return this.caracteristicas.crear(dto);
  }

  @RequierePermiso('plataforma.gestionar')
  @Get()
  listar() {
    return this.caracteristicas.listar();
  }

  @RequierePermiso('plataforma.gestionar')
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCaracteristicaDto,
  ) {
    return this.caracteristicas.actualizar(id, dto);
  }
}
