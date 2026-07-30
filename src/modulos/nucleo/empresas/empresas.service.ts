import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { ActualizarEmpresaDto, CrearEmpresaDto } from './dto/empresas.dto';

/** CRUD de empresas (Company) del tenant. */
@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crear(dto: CrearEmpresaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id: dto.organizacionId, inquilinoId },
        select: { id: true },
      });
      if (!org) throw new NotFoundException('Organización no encontrada');

      const duplicado = await tx.company.findFirst({
        where: { inquilinoId, ruc: dto.ruc },
        select: { id: true },
      });
      if (duplicado) {
        throw new ConflictException(`Ya existe una empresa con RUC ${dto.ruc}`);
      }

      return tx.company.create({
        data: {
          inquilinoId,
          organizacionId: dto.organizacionId,
          razonSocial: dto.razonSocial,
          ruc: dto.ruc,
          nombreComercial: dto.nombreComercial ?? null,
          sunatUbigeo: dto.sunatUbigeo ?? null,
          fiscalAddress: dto.fiscalAddress ?? null,
          moneda: dto.moneda ?? 'PEN',
        },
        select: { id: true, razonSocial: true, ruc: true, estado: true },
      });
    });
  }

  listar() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.company.findMany({
        where: { inquilinoId },
        orderBy: { razonSocial: 'asc' },
        select: {
          id: true,
          razonSocial: true,
          nombreComercial: true,
          ruc: true,
          moneda: true,
          estado: true,
        },
      }),
    );
  }

  async obtener(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const empresa = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.company.findFirst({
        where: { id, inquilinoId },
        include: {
          sucursales: { select: { id: true, codigo: true, nombre: true } },
        },
      }),
    );
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return empresa;
  }

  async actualizar(id: string, dto: ActualizarEmpresaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigir(tx, inquilinoId, id);
      return tx.company.update({
        where: { id },
        data: {
          razonSocial: dto.razonSocial ?? undefined,
          nombreComercial: dto.nombreComercial ?? undefined,
          sunatUbigeo: dto.sunatUbigeo ?? undefined,
          fiscalAddress: dto.fiscalAddress ?? undefined,
        },
        select: { id: true, razonSocial: true, estado: true },
      });
    });
  }

  private async exigir(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    id: string,
  ) {
    const empresa = await tx.company.findFirst({
      where: { id, inquilinoId },
      select: { id: true },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
  }
}
