import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CrearNotificacionDto } from './dto/notificaciones.dto';

/**
 * Notificaciones a usuarios del tenant. Persiste la notificación (in-app lista
 * para consumir); el envío por email/SMS es un worker/proveedor aparte
 * (pendiente), por eso nace en estado PENDIENTE.
 */
@Injectable()
export class NotificacionesService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crear(dto: CrearNotificacionDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.notification.create({
        data: {
          inquilinoId,
          recipientId: dto.recipientId,
          channel: dto.channel,
          templateKey: dto.templateKey,
          subject: dto.subject ?? null,
          carga: dto.carga as Prisma.InputJsonValue,
        },
        select: { id: true, estado: true, creadoEn: true },
      }),
    );
  }

  /** Notificaciones del usuario autenticado (bandeja in-app). */
  listar(soloNoLeidas?: boolean) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.notification.findMany({
        where: {
          inquilinoId,
          recipientId: identidadUsuarioId,
          ...(soloNoLeidas ? { readAt: null } : {}),
        },
        orderBy: { creadoEn: 'desc' },
        take: 100,
      }),
    );
  }

  async marcarLeida(id: string) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const noti = await tx.notification.findFirst({
        where: { id, inquilinoId, recipientId: identidadUsuarioId },
        select: { id: true },
      });
      if (!noti) throw new NotFoundException('Notificación no encontrada');
      await tx.notification.update({
        where: { id },
        data: { estado: 'LEIDA', readAt: new Date() },
      });
      return { id, estado: 'LEIDA' as const };
    });
  }
}
