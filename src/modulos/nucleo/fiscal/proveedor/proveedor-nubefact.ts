import { Injectable, Logger } from '@nestjs/common';
import { ResultadoEmision, SolicitudEmision } from '../fiscal.tipos';
import { ProveedorFacturacion } from './proveedor-facturacion';

/**
 * Nubefact-style OSE adapter. Maps our canonical SolicitudEmision to the
 * provider's JSON API, posts it, and maps the response back to ResultadoEmision.
 * Enabled with FISCAL_PROVIDER=nubefact; reads credentials from:
 *   FISCAL_NUBEFACT_URL    - per-ruc endpoint (https://api.nubefact.com/api/v1/<uuid>)
 *   FISCAL_NUBEFACT_TOKEN  - bearer token
 *
 * NOTE: this is the integration skeleton. The field mapping below follows
 * Nubefact's documented contract but must be validated against a real sandbox
 * account before production use (tax breakdown per line, note types, etc.).
 */
@Injectable()
export class ProveedorNubefact implements ProveedorFacturacion {
  readonly nombre = 'nubefact';
  private readonly logger = new Logger(ProveedorNubefact.name);
  private readonly url = process.env.FISCAL_NUBEFACT_URL ?? '';
  private readonly token = process.env.FISCAL_NUBEFACT_TOKEN ?? '';

  async emitir(solicitud: SolicitudEmision): Promise<ResultadoEmision> {
    if (!this.url || !this.token) {
      throw new Error(
        'Proveedor Nubefact sin configurar: definir FISCAL_NUBEFACT_URL y FISCAL_NUBEFACT_TOKEN',
      );
    }

    const cuerpo = this.mapearSolicitud(solicitud);
    const respuesta = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Token token="${this.token}"`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    });
    const datos = (await respuesta.json()) as Record<string, unknown>;

    if (!respuesta.ok || datos.errors) {
      this.logger.warn(
        `Nubefact rechazó ${solicitud.serie}-${solicitud.numero}: ${JSON.stringify(datos.errors ?? datos)}`,
      );
      return {
        aceptado: false,
        estado: 'RECHAZADO',
        ticket: null,
        codigoRespuesta: String(respuesta.status),
        descripcion:
          typeof datos.errors === 'string'
            ? datos.errors
            : JSON.stringify(datos.errors ?? 'Rechazado por el proveedor'),
        xmlBase64: null,
        cdrBase64: null,
        crudo: datos,
      };
    }

    const aceptado =
      datos.aceptada_por_sunat === true || datos.sunat_soap_error == null;
    return {
      aceptado,
      estado: aceptado ? 'ACEPTADO' : 'ENVIADO',
      ticket: (datos.sunat_ticket_numero as string) ?? null,
      codigoRespuesta: (datos.sunat_responsecode as string) ?? null,
      descripcion: (datos.sunat_description as string) ?? null,
      xmlBase64: null,
      cdrBase64: null,
      crudo: datos,
    };
  }

  /** Maps our canonical document to Nubefact's `operacion: generar_comprobante`. */
  private mapearSolicitud(s: SolicitudEmision): Record<string, unknown> {
    const tipoNubefact =
      s.tipoCodigo === '01'
        ? 1
        : s.tipoCodigo === '03'
          ? 2
          : s.tipoCodigo === '07'
            ? 3
            : 4;
    return {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: tipoNubefact,
      serie: s.serie,
      numero: Number(s.numero),
      sunat_transaction: 1,
      cliente_tipo_de_documento: s.cliente.tipoDocumento ?? '0',
      cliente_numero_de_documento: s.cliente.numeroDocumento ?? '',
      cliente_denominacion: s.cliente.razonSocial,
      cliente_direccion: s.cliente.direccion ?? '',
      fecha_de_emision: s.fechaEmision.toISOString().slice(0, 10),
      moneda: s.moneda === 'PEN' ? 1 : 2,
      total_gravada: Number(s.totales.gravado),
      total_exonerada: Number(s.totales.exonerado),
      total_inafecta: Number(s.totales.inafecto),
      total_igv: Number(s.totales.igv),
      // ICBPER (bolsas): Nubefact lo declara como "otros tributos" del documento.
      total_otros_tributos: Number(s.totales.icbper),
      total_impuestos: Number(s.totales.igv) + Number(s.totales.icbper),
      total: Number(s.totales.total),
      enviar_automaticamente_a_la_sunat: true,
      items: s.items.map((i) => ({
        unidad_de_medida: i.codigoUnidad,
        descripcion: i.descripcion,
        cantidad: Number(i.cantidad),
        valor_unitario: Number(i.valorUnitario),
        precio_unitario: Number(i.precioUnitario),
        tipo_de_igv: Number(i.tipoAfectacion),
        igv: Number(i.montoImpuesto),
        total_base_igv: Number(i.baseImponible),
        // ICBPER por ítem (monto total y factor por unidad); 0 si no aplica.
        icbper: Number(i.montoIcbper),
        factor_icbper: Number(i.factorIcbper),
        total: Number(i.total),
      })),
      ...(s.nota
        ? {
            documento_que_se_modifica_tipo:
              s.nota.docRelacionadoTipo === '01' ? 1 : 2,
            documento_que_se_modifica_serie: s.nota.docRelacionadoSerie,
            documento_que_se_modifica_numero: Number(
              s.nota.docRelacionadoNumero,
            ),
            tipo_de_nota_de_credito: Number(s.nota.motivoCodigo),
          }
        : {}),
    };
  }
}
