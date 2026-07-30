import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import {
  ActualizarCaracteristicaDto,
  CrearCaracteristicaDto,
} from './dto/caracteristicas.dto';

/**
 * Catálogo GLOBAL de características (features) del SaaS. No es tenant-scoped:
 * son datos de referencia de plataforma versionados por el operador. Las
 * suscripciones derivan sus entitlements de estas características vía PlanFeature.
 */
@Injectable()
export class CaracteristicasService {
  constructor(private readonly db: ManagementPrismaService) {}

  async crear(dto: CrearCaracteristicaDto) {
    const duplicado = await this.db.feature.findUnique({
      where: { clave: dto.clave },
      select: { id: true },
    });
    if (duplicado) {
      throw new ConflictException(`Ya existe la característica ${dto.clave}`);
    }
    return this.db.feature.create({
      data: {
        clave: dto.clave,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        valorType: dto.valorType ?? 'BOOLEANO',
        unit: dto.unit ?? null,
      },
    });
  }

  listar() {
    return this.db.feature.findMany({ orderBy: { clave: 'asc' } });
  }

  async actualizar(id: string, dto: ActualizarCaracteristicaDto) {
    await this.exigir(id);
    return this.db.feature.update({
      where: { id },
      data: {
        nombre: dto.nombre ?? undefined,
        descripcion: dto.descripcion ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  private async exigir(id: string) {
    const existe = await this.db.feature.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Característica no encontrada');
  }
}
