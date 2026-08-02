import { Injectable, Logger } from '@nestjs/common';
import { ResultadoEmision, SolicitudEmision } from '../fiscal.tipos';
import { ProveedorFacturacion } from './proveedor-facturacion';

/**
 * Default provider: simulates an OSE that always accepts. Lets the full
 * emission pipeline (series → document → outbox → worker → ACEPTADO) run
 * end-to-end in dev/test with no external credentials. Swap for a real OSE via
 * FISCAL_PROVIDER=nubefact in production.
 */
@Injectable()
export class ProveedorSandbox implements ProveedorFacturacion {
  readonly nombre = 'sandbox';
  private readonly logger = new Logger(ProveedorSandbox.name);

  emitir(solicitud: SolicitudEmision): Promise<ResultadoEmision> {
    const comprobante = `${solicitud.serie}-${solicitud.numero}`;
    this.logger.log(
      `SANDBOX aceptando ${solicitud.tipoCodigo} ${comprobante} (total ${solicitud.totales.total} ${solicitud.moneda})`,
    );
    return Promise.resolve({
      aceptado: true,
      estado: 'ACEPTADO',
      ticket: `SANDBOX-${solicitud.documentoId}`,
      codigoRespuesta: '0',
      descripcion: `La ${solicitud.tipoCodigo} ${comprobante} ha sido aceptada (sandbox)`,
      xmlBase64: null,
      cdrBase64: null,
      crudo: { proveedor: 'sandbox', solicitud: comprobante },
    });
  }
}
