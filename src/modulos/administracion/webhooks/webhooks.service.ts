import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CifradoService } from '../../../compartido/seguridad/cifrado.service';
import { EmitirEventoDto, RegistrarEndpointDto } from './dto/webhooks.dto';

/**
 * Webhooks salientes: el tenant registra URLs y, al emitir un evento, se crea
 * una entrega firmada (HMAC) por endpoint suscrito y se intenta despachar en el
 * acto (best-effort). El reintento robusto con backoff queda como worker aparte
 * (pendiente), pero el estado/attempt ya se persisten para retomarlo.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly db: ManagementPrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly cifrado: CifradoService,
  ) {}

  async registrarEndpoint(dto: RegistrarEndpointDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const secreto = dto.signingSecret ?? randomUUID().replace(/-/g, '');
    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const endpoint = await tx.webhookEndpoint.create({
        data: {
          inquilinoId,
          url: dto.url,
          descripcion: dto.descripcion ?? null,
          eventosSuscritos: dto.eventosSuscritos,
          gestorSecreto: 'inline',
          signingSecretReference: this.cifrado.cifrar(secreto),
        },
        select: { id: true, url: true, isActive: true },
      });
      // El secreto se devuelve UNA sola vez para que el consumidor lo guarde.
      return { ...endpoint, signingSecret: secreto };
    });
  }

  listarEndpoints() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.webhookEndpoint.findMany({
        where: { inquilinoId },
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          url: true,
          eventosSuscritos: true,
          isActive: true,
          failureCount: true,
          creadoEn: true,
        },
      }),
    );
  }

  async desactivarEndpoint(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const endpoint = await tx.webhookEndpoint.findFirst({
        where: { id, inquilinoId },
        select: { id: true },
      });
      if (!endpoint) throw new NotFoundException('Endpoint no encontrado');
      await tx.webhookEndpoint.update({
        where: { id },
        data: { isActive: false, deshabilitadoEn: new Date() },
      });
      return { id, isActive: false };
    });
  }

  /** Emite un evento a todos los endpoints activos suscritos y despacha. */
  async emitir(dto: EmitirEventoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const eventId = randomUUID();
    const cuerpo = JSON.stringify({
      eventId,
      type: dto.eventType,
      data: dto.carga,
    });

    const endpoints = await this.db.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.webhookEndpoint.findMany({
        where: {
          inquilinoId,
          isActive: true,
          eventosSuscritos: { has: dto.eventType },
        },
        select: { id: true, url: true, signingSecretReference: true },
      }),
    );

    const entregas: Array<Record<string, unknown>> = [];
    for (const endpoint of endpoints) {
      const entrega = await this.despachar(
        inquilinoId,
        endpoint,
        eventId,
        dto.eventType,
        dto.carga,
        cuerpo,
      );
      entregas.push(entrega);
    }
    return { eventId, endpoints: endpoints.length, entregas };
  }

  private async despachar(
    inquilinoId: string,
    endpoint: { id: string; url: string; signingSecretReference: string },
    eventId: string,
    eventType: string,
    carga: Record<string, unknown>,
    cuerpo: string,
  ) {
    const secreto = this.cifrado.descifrar(endpoint.signingSecretReference);
    const firma = createHmac('sha256', secreto).update(cuerpo).digest('hex');

    let estado: 'EXITOSA' | 'FALLIDA' = 'FALLIDA';
    let estadoRespuesta: number | null = null;
    let ultimoError: string | null = null;
    try {
      const respuesta = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': firma,
          'X-Webhook-Event': eventType,
        },
        body: cuerpo,
      });
      estadoRespuesta = respuesta.status;
      estado = respuesta.ok ? 'EXITOSA' : 'FALLIDA';
    } catch (error) {
      ultimoError = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Fallo entregando webhook a ${endpoint.url}: ${ultimoError}`,
      );
    }

    return this.db.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventId,
          eventType,
          idempotencyKey: `${endpoint.id}:${eventId}`,
          carga: carga as never,
          estado,
          attemptCount: 1,
          estadoRespuesta,
          ultimoError,
          entregadoEn: estado === 'EXITOSA' ? new Date() : null,
        },
        select: { id: true, estado: true, estadoRespuesta: true },
      }),
    );
  }
}
