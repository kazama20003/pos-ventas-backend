import { Body, Controller, Post } from '@nestjs/common';
import { RequierePermiso } from '../identidad/decoradores';
import { ArchivosService } from './archivos.service';
import { ConfirmarSubidaDto, PresignSubidaDto } from './dto/archivos.dto';

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivos: ArchivosService) {}

  @Post('presign')
  @RequierePermiso('archivos.subir')
  presign(@Body() dto: PresignSubidaDto) {
    return this.archivos.presignSubida(dto);
  }

  @Post('confirmar')
  @RequierePermiso('archivos.subir')
  confirmar(@Body() dto: ConfirmarSubidaDto) {
    return this.archivos.confirmarSubida(dto);
  }
}
