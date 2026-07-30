import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RequierePermiso } from '../../nucleo/identidad/decoradores';
import {
  AsignarFeatureDto,
  CrearPlanDto,
  CrearVersionDto,
  DefinirPrecioDto,
} from './dto/planes.dto';
import { PlanesService } from './planes.service';

@Controller('plataforma/planes')
export class PlanesController {
  constructor(private readonly planes: PlanesService) {}

  @RequierePermiso('plataforma.gestionar')
  @Post()
  crearPlan(@Body() dto: CrearPlanDto) {
    return this.planes.crearPlan(dto);
  }

  @RequierePermiso('plataforma.gestionar')
  @Get()
  listar() {
    return this.planes.listarPlanes();
  }

  @RequierePermiso('plataforma.gestionar')
  @Get('versiones/:versionId')
  obtenerVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.planes.obtenerVersion(versionId);
  }

  @RequierePermiso('plataforma.gestionar')
  @Post(':planId/versiones')
  crearVersion(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CrearVersionDto,
  ) {
    return this.planes.crearVersion(planId, dto);
  }

  @RequierePermiso('plataforma.gestionar')
  @Post('versiones/:versionId/caracteristicas')
  asignarFeature(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: AsignarFeatureDto,
  ) {
    return this.planes.asignarFeature(versionId, dto);
  }

  @RequierePermiso('plataforma.gestionar')
  @Post('versiones/:versionId/precios')
  definirPrecio(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: DefinirPrecioDto,
  ) {
    return this.planes.definirPrecio(versionId, dto);
  }

  @RequierePermiso('plataforma.gestionar')
  @Post('versiones/:versionId/publicar')
  publicar(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.planes.publicarVersion(versionId);
  }
}
