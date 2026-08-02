import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EventoWebhook, ResultadoCargo, SolicitudCargo } from '../pagos.tipos';
import { ProveedorPago } from './proveedor-pago';

/**
 * Adapter de Culqi (tarjeta + Yape en Perú). Mapea SolicitudCargo a su API de
 * cargos y normaliza/verifica el webhook. Se activa con PAGOS_PROVIDER=culqi.
 * La llave secreta se toma por comercio del PaymentProviderAccount
 * (solicitud.credencialSecreta); CULQI_SECRET_KEY sirve solo de fallback global.
 *
 * NOTA: integración lista a nivel de código; solo falta contratar Culqi y cargar
 * las llaves reales. Validar contra la cuenta sandbox antes de producción
 * (formato exacto de errores y de la firma del webhook según el panel de Culqi).
 */
@Injectable()
export class ProveedorPagoCulqi implements ProveedorPago {
  readonly nombre = 'culqi';
  private readonly logger = new Logger(ProveedorPagoCulqi.name);
  private readonly secretFallback = process.env.CULQI_SECRET_KEY ?? '';
  private readonly url = process.env.CULQI_URL ?? 'https://api.culqi.com/v2';

  async crearCargo(solicitud: SolicitudCargo): Promise<ResultadoCargo> {
    const secret = solicitud.credencialSecreta || this.secretFallback;
    if (!secret) {
      throw new Error(
        'Culqi sin configurar: falta la llave del comercio (PaymentProviderAccount) o CULQI_SECRET_KEY',
      );
    }
    if (!solicitud.fuente) {
      throw new Error('El cargo Culqi requiere un token/fuente (source_id)');
    }

    // Culqi maneja montos en céntimos.
    const amount = Math.round(Number(solicitud.monto) * 100);
    const respuesta = await fetch(`${this.url}/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency_code: solicitud.moneda,
        email: solicitud.email ?? 'cliente@ejemplo.com',
        source_id: solicitud.fuente,
        description: solicitud.descripcion ?? undefined,
        metadata: solicitud.metadata ?? undefined,
      }),
    });
    const datos = (await respuesta.json()) as Record<string, unknown>;

    if (!respuesta.ok || datos.object === 'error') {
      this.logger.warn(
        `Culqi rechazó el cargo: ${JSON.stringify(datos.user_message ?? datos)}`,
      );
      return {
        estadoIntento: 'FALLIDO',
        estadoTransaccion: 'FALLIDA',
        transaccionProveedorId: (datos.charge_id as string) ?? null,
        codigoAutorizacion: null,
        codigoError: (datos.code as string) ?? String(respuesta.status),
        mensajeError:
          (datos.user_message as string) ?? 'Cargo rechazado por la pasarela',
        crudo: datos,
      };
    }

    return {
      estadoIntento: 'EXITOSO',
      estadoTransaccion: 'CAPTURADA',
      transaccionProveedorId: (datos.id as string) ?? null,
      codigoAutorizacion:
        ((datos.authorization_code as string) ??
          (datos.reference_code as string)) ||
        null,
      codigoError: null,
      mensajeError: null,
      crudo: datos,
    };
  }

  verificarFirma(
    cuerpo: Buffer,
    headers: Record<string, string>,
    secreto: string | null,
  ): boolean {
    const firmaRecibida =
      headers['x-culqi-signature'] ?? headers['culqi-signature'];
    // Sin secreto o sin firma no se puede verificar: se acepta pero se advierte.
    if (!secreto || !firmaRecibida) {
      this.logger.warn(
        'Webhook Culqi sin firma verificable (falta secreto o cabecera de firma)',
      );
      return true;
    }
    const esperada = createHmac('sha256', secreto).update(cuerpo).digest('hex');
    const a = Buffer.from(esperada);
    const b = Buffer.from(firmaRecibida);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  interpretarWebhook(cuerpo: Buffer): EventoWebhook {
    const datos = JSON.parse(cuerpo.toString('utf8')) as Record<
      string,
      unknown
    >;
    const data = (datos.data as Record<string, unknown>) ?? {};
    const tipo = (datos.type as string) ?? 'charge.creation.succeeded';
    const exitoso = tipo.includes('succeeded') || tipo.includes('creation');
    return {
      eventoProveedorId: (datos.id as string) ?? (data.id as string) ?? '',
      tipo,
      referenciaComerciante: (data.merchant_code as string) ?? null,
      transaccionProveedorId: (data.id as string) ?? null,
      intentoProveedorId: null,
      estadoTransaccion: exitoso ? 'CAPTURADA' : 'FALLIDA',
      estadoIntento: exitoso ? 'EXITOSO' : 'FALLIDO',
      crudo: datos,
    };
  }
}
