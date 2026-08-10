import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generado/administracion/client';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ConsumirTenantCreadoDto } from './dto/consumir-tenant-creado.dto';

const FUENTE_OPERACIONES = 'operaciones';
const EVENTO_TENANT_CREADO = 'tenant.created';

@Injectable()
export class TenantAdministrationService {
  constructor(
    private readonly administracion: ManagementPrismaService,
    private readonly operaciones: CorePrismaService,
  ) {}

  async consumirTenantCreado(
    evento: ConsumirTenantCreadoDto,
    inquilinoAutenticadoId: string,
  ) {
    this.validarEventoAutenticado(evento, inquilinoAutenticadoId);
    return this.procesarTenantCreado(evento);
  }

  /** Consume a trusted event claimed from the Core outbox worker. */
  async procesarTenantCreado(evento: ConsumirTenantCreadoDto) {
    this.validarEvento(evento);

    // Confirma bajo RLS que el tenant fuente existe antes de proyectarlo.
    await this.operaciones.ejecutarEnTenant(evento.inquilinoId, (tx) =>
      tx.tenant.findUniqueOrThrow({
        where: { id: evento.inquilinoId },
        select: { id: true },
      }),
    );

    try {
      await this.administracion.ejecutarEnTenant(
        evento.carga.tenantId,
        async (tx) => {
          // The tenant must exist before its tenant-scoped inbox row can pass RLS.
          await tx.tenant.upsert({
            where: { id: evento.carga.tenantId },
            create: {
              id: evento.carga.tenantId,
              slug: evento.carga.slug,
              nombreVisible: evento.carga.nombreVisible,
              razonSocial: evento.carga.razonSocial,
            },
            update: {
              slug: evento.carga.slug,
              nombreVisible: evento.carga.nombreVisible,
              razonSocial: evento.carga.razonSocial,
            },
          });
          await tx.administrationInbox.create({
            data: {
              inquilinoId: evento.carga.tenantId,
              source: FUENTE_OPERACIONES,
              messageId: evento.id,
              eventType: evento.eventType,
              idempotencyKey: evento.idempotencyKey,
              carga: evento.carga as unknown as Prisma.InputJsonValue,
            },
          });

          await tx.tenantControl.upsert({
            where: { inquilinoId: evento.carga.tenantId },
            create: { inquilinoId: evento.carga.tenantId },
            update: {},
          });
          await tx.tenantConfiguration.upsert({
            where: { inquilinoId: evento.carga.tenantId },
            create: {
              inquilinoId: evento.carga.tenantId,
              region: evento.carga.region,
              timezone: evento.carga.timezone,
              locale: evento.carga.locale,
            },
            update: {
              region: evento.carga.region,
              timezone: evento.carga.timezone,
              locale: evento.carga.locale,
            },
          });
          await tx.tenantOnboarding.upsert({
            where: { inquilinoId: evento.carga.tenantId },
            create: { inquilinoId: evento.carga.tenantId },
            update: {},
          });

          await tx.administrationInbox.update({
            where: {
              source_messageId: {
                source: FUENTE_OPERACIONES,
                messageId: evento.id,
              },
            },
            data: {
              inquilinoId: evento.carga.tenantId,
              estado: 'PROCESADO',
              procesadoEn: new Date(),
            },
          });
        },
      );
      return { procesado: true, duplicado: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { procesado: true, duplicado: true };
      }
      throw error;
    }
  }

  private validarEventoAutenticado(
    evento: ConsumirTenantCreadoDto,
    inquilinoAutenticadoId: string,
  ): void {
    this.validarEvento(evento);
    if (evento.inquilinoId !== inquilinoAutenticadoId) {
      throw new BadRequestException(
        'El evento no corresponde al tenant autenticado',
      );
    }
  }

  private validarEvento(evento: ConsumirTenantCreadoDto): void {
    if (evento.eventType !== EVENTO_TENANT_CREADO) {
      throw new BadRequestException('Tipo de evento no soportado');
    }
    if (evento.inquilinoId !== evento.carga.tenantId) {
      throw new BadRequestException(
        'El evento no corresponde al tenant indicado',
      );
    }
  }
}
