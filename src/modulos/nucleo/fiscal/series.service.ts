import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CrearSerieDto } from './dto/serie.dto';

/**
 * CRUD de series de comprobante (DocumentSeries). Cada empresa define sus
 * series por tipo de documento (BOLETA B001, FACTURA F001…); el POS elige una
 * al cobrar y el correlativo se reserva de forma atómica al emitir.
 */
@Injectable()
export class SeriesService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async listar(empresaId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const series = await tx.documentSeries.findMany({
        where: { inquilinoId, empresaId },
        select: {
          id: true,
          empresaId: true,
          sucursalId: true,
          documentType: true,
          series: true,
          nextNumber: true,
          estado: true,
        },
        orderBy: [{ documentType: 'asc' }, { series: 'asc' }],
      });
      return series.map((s) => ({
        ...s,
        nextNumber: Number(s.nextNumber),
      }));
    });
  }

  async crear(dto: CrearSerieDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const empresa = await tx.company.findFirst({
        where: { id: dto.empresaId, inquilinoId },
        select: { id: true },
      });
      if (!empresa) throw new BadRequestException('Empresa no encontrada');

      const serie = await tx.documentSeries
        .create({
          data: {
            inquilinoId,
            empresaId: dto.empresaId,
            sucursalId: dto.sucursalId ?? null,
            documentType: dto.documentType,
            series: dto.series,
            nextNumber: BigInt(dto.nextNumber ?? 1),
          },
          select: {
            id: true,
            documentType: true,
            series: true,
            nextNumber: true,
            estado: true,
          },
        })
        .catch((e: unknown) => {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          ) {
            throw new BadRequestException(
              `Ya existe la serie ${dto.series} para ${dto.documentType}`,
            );
          }
          throw e;
        });
      return { ...serie, nextNumber: Number(serie.nextNumber) };
    });
  }

  async cambiarEstado(id: string, activar: boolean) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const serie = await tx.documentSeries.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!serie) throw new NotFoundException('Serie no encontrada');
      const actualizada = await tx.documentSeries.update({
        where: { id },
        data: { estado: activar ? 'ACTIVO' : 'ARCHIVADO' },
        select: { id: true, estado: true },
      });
      return actualizada;
    });
  }
}
