import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AfectacionImpuesto,
  Prisma,
  TipoDocumentoElectronico,
  TipoDocumentoIdentidad,
} from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  ComprobanteConstruido,
  ConstructorComprobante,
  EntradaComprobante,
} from './constructor-comprobante';
import { EmitirComprobanteDto } from './dto/emitir-comprobante.dto';
import { NotaCreditoDto } from './dto/nota-credito.dto';
import {
  AFECTACION_SUNAT,
  DOC_IDENTIDAD_SUNAT,
  ResultadoEmision,
  SolicitudEmision,
  TIPO_DOC_SUNAT,
} from './fiscal.tipos';
import { ESTADOS_PROCESABLES, puedeTransicionar } from './maquina-estados';
import {
  PROVEEDOR_FACTURACION,
  ProveedorFacturacion,
} from './proveedor/proveedor-facturacion';

type TxPrisma = Prisma.TransactionClient;

interface SerieReservada {
  series: string;
  numero: bigint;
  empresaId: string;
}

/**
 * Orchestrates electronic invoicing: builds a fiscal document from a sale,
 * reserves its correlative under a row lock, enqueues it for async delivery
 * (OutboxEvent), and — driven by ProcesadorFiscal — sends it to the OSE/PSE and
 * records SUNAT's verdict. All external I/O lives in ProveedorFacturacion; this
 * service only moves the document through its state machine.
 */
@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly armador: ConstructorComprobante,
    @Inject(PROVEEDOR_FACTURACION)
    private readonly proveedor: ProveedorFacturacion,
  ) {}

  /** Issues a FACTURA/BOLETA from a settled sale and queues it for SUNAT. */
  async emitirDesdeVenta(dto: EmitirComprobanteDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const venta = await tx.sale.findFirst({
        where: { id: dto.ventaId, inquilinoId },
        include: {
          articulos: { orderBy: { lineNumber: 'asc' } },
          company: true,
          customer: true,
        },
      });
      if (!venta) {
        throw new NotFoundException('Venta no encontrada');
      }
      if (venta.estado === 'BORRADOR' || venta.estado === 'ANULADA') {
        throw new ConflictException(
          `No se puede facturar una venta en estado ${venta.estado}`,
        );
      }

      const tipo: TipoDocumentoElectronico =
        dto.tipoComprobante ??
        (venta.customer?.documentType === 'RUC' ? 'FACTURA' : 'BOLETA');
      if (tipo === 'FACTURA' && venta.customer?.documentType !== 'RUC') {
        throw new BadRequestException(
          'Una factura requiere un cliente con RUC',
        );
      }

      // Idempotency: a sale already invoiced (and not rejected) returns the
      // existing document instead of minting a duplicate correlative.
      const existente = await tx.electronicDocument.findFirst({
        where: {
          inquilinoId,
          ventaId: venta.id,
          documentType: tipo,
          estado: { notIn: ['RECHAZADO', 'ERROR', 'ANULADO'] },
        },
        orderBy: { creadoEn: 'desc' },
      });
      if (existente) {
        return this.resumen(existente, true);
      }

      const serie = await this.reservarCorrelativo(
        tx,
        inquilinoId,
        dto.serieId,
        tipo,
      );
      if (serie.empresaId !== venta.empresaId) {
        throw new BadRequestException(
          'La serie no pertenece a la empresa de la venta',
        );
      }

      const construido = this.armador.construir(
        this.entradaDesdeVenta(venta, tipo),
      );

      const doc = await this.persistirDocumento(tx, inquilinoId, {
        empresaId: venta.empresaId,
        sucursalId: venta.sucursalId,
        ventaId: venta.id,
        seriesId: dto.serieId,
        documentType: tipo,
        series: serie.series,
        numero: serie.numero,
        moneda: venta.moneda,
        customerDocumentType: venta.customer?.documentType ?? null,
        customerDocumentNumber: venta.customer?.documentNumber ?? null,
        construido,
      });

      return this.resumen(doc, false);
    });
  }

  /** Issues a NOTA_CREDITO that fully reverses an accepted document. */
  async emitirNotaCredito(dto: NotaCreditoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();

    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const origen = await tx.electronicDocument.findFirst({
        where: { id: dto.documentoOrigenId, inquilinoId },
        include: { articulos: { orderBy: { lineNumber: 'asc' } } },
      });
      if (!origen) {
        throw new NotFoundException('Documento de origen no encontrado');
      }
      if (
        origen.estado !== 'ACEPTADO' &&
        origen.estado !== 'ACEPTADO_CON_OBSERVACIONES'
      ) {
        throw new ConflictException(
          'Solo se puede emitir nota de crédito sobre un comprobante aceptado',
        );
      }

      const serie = await this.reservarCorrelativo(
        tx,
        inquilinoId,
        dto.serieId,
        'NOTA_CREDITO',
      );

      const entrada: EntradaComprobante = {
        documentType: 'NOTA_CREDITO',
        moneda: origen.moneda,
        emisor:
          origen.issuerSnapshot as unknown as EntradaComprobante['emisor'],
        cliente:
          origen.customerSnapshot as unknown as EntradaComprobante['cliente'],
        lineas: origen.articulos.map((a) => ({
          lineNumber: a.lineNumber,
          varianteId: a.varianteId,
          skuSnapshot: a.sku,
          nombreSnapshot: a.descripcion,
          unitCodeSnapshot: a.sunatUnitCode,
          afectacion: a.affectation,
          cantidad: a.cantidad,
          precioUnitario: a.precioUnitario,
          valorUnitario: a.valorUnitario,
          montoImpuesto: a.montoImpuesto,
          montoOtrosTributos: a.montoOtrosTributos,
          total: a.total,
        })),
      };
      const construido = this.armador.construir(entrada);

      const doc = await this.persistirDocumento(tx, inquilinoId, {
        empresaId: origen.empresaId,
        sucursalId: origen.sucursalId,
        ventaId: origen.ventaId,
        seriesId: dto.serieId,
        documentType: 'NOTA_CREDITO',
        series: serie.series,
        numero: serie.numero,
        moneda: origen.moneda,
        customerDocumentType: origen.customerDocumentType,
        customerDocumentNumber: origen.customerDocumentNumber,
        construido,
        nota: {
          motivoCodigo: dto.motivoCodigo,
          motivoTexto: dto.motivoTexto,
          relatedDocumentType: origen.documentType,
          relatedSeries: origen.series,
          relatedNumber: origen.number,
        },
      });

      return this.resumen(doc, false);
    });
  }

  /**
   * Sends a queued/errored document to the provider and records SUNAT's
   * verdict. Called by ProcesadorFiscal. Provider I/O runs outside any DB
   * transaction so a network call never holds a row/tenant lock open.
   */
  async procesarPendiente(documentoId: string, inquilinoId: string) {
    const doc = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.electronicDocument.findFirst({
        where: { id: documentoId, inquilinoId },
        include: {
          articulos: { orderBy: { lineNumber: 'asc' } },
          leyendas: true,
        },
      }),
    );
    if (!doc) {
      return { procesado: false, motivo: 'documento no encontrado' };
    }
    if (!ESTADOS_PROCESABLES.includes(doc.estado)) {
      return {
        procesado: false,
        motivo: `estado no procesable: ${doc.estado}`,
      };
    }

    let resultado: ResultadoEmision;
    try {
      resultado = await this.proveedor.emitir(this.aSolicitud(doc));
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo emitiendo ${documentoId}: ${mensaje}`);
      await this.registrarResultado(inquilinoId, documentoId, doc.estado, {
        estado: 'ERROR',
        eventType: 'ERROR_PROVEEDOR',
        message: mensaje,
      });
      return { procesado: false, motivo: mensaje };
    }

    await this.registrarResultado(inquilinoId, documentoId, doc.estado, {
      estado: resultado.estado,
      eventType: 'RESPUESTA_PROVEEDOR',
      message: resultado.descripcion,
      resultado,
    });
    return { procesado: true, estado: resultado.estado };
  }

  /** Re-queues a rejected/errored document for another delivery attempt. */
  async reintentar(documentoId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const doc = await tx.electronicDocument.findFirst({
        where: { id: documentoId, inquilinoId },
        select: { id: true, estado: true },
      });
      if (!doc) throw new NotFoundException('Documento no encontrado');
      if (!puedeTransicionar(doc.estado, 'EN_COLA')) {
        throw new ConflictException(
          `No se puede reencolar un documento en estado ${doc.estado}`,
        );
      }
      await tx.electronicDocument.update({
        where: { id: doc.id },
        data: { estado: 'EN_COLA' },
      });
      await this.encolar(tx, inquilinoId, doc.id, 'reintento');
      return { id: doc.id, estado: 'EN_COLA' as const };
    });
  }

  async obtener(documentoId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const doc = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.electronicDocument.findFirst({
        where: { id: documentoId, inquilinoId },
        include: {
          articulos: { orderBy: { lineNumber: 'asc' } },
          leyendas: true,
          eventos: { orderBy: { occurredAt: 'desc' }, take: 20 },
        },
      }),
    );
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async listar(filtros: { estado?: string; take?: number }) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.electronicDocument.findMany({
        where: {
          inquilinoId,
          estado: filtros.estado ? (filtros.estado as never) : undefined,
        },
        orderBy: { creadoEn: 'desc' },
        take: Math.min(filtros.take ?? 50, 200),
        select: {
          id: true,
          documentType: true,
          series: true,
          number: true,
          estado: true,
          total: true,
          moneda: true,
          issueDate: true,
          customerName: true,
        },
      }),
    );
  }

  // ---- internals -----------------------------------------------------------

  private entradaDesdeVenta(
    venta: SaleConDetalle,
    tipo: TipoDocumentoElectronico,
  ): EntradaComprobante {
    return {
      documentType: tipo,
      moneda: venta.moneda,
      emisor: {
        ruc: venta.company.ruc,
        razonSocial: venta.company.razonSocial,
        nombreComercial: venta.company.nombreComercial,
        ubigeo: venta.company.sunatUbigeo,
        direccion: venta.company.fiscalAddress,
      },
      cliente: venta.customer
        ? {
            documentType: venta.customer.documentType,
            documentNumber: venta.customer.documentNumber,
            razonSocial: venta.customer.razonSocial,
            direccion: null,
          }
        : {
            documentType: null,
            documentNumber: null,
            razonSocial: 'CLIENTE VARIOS',
            direccion: null,
          },
      lineas: venta.articulos.map((a) => ({
        lineNumber: a.lineNumber,
        varianteId: a.varianteId,
        skuSnapshot: a.skuSnapshot,
        nombreSnapshot: a.nombreSnapshot,
        unitCodeSnapshot: a.unitCodeSnapshot,
        afectacion: a.AfectacionImpuesto,
        cantidad: a.cantidad,
        precioUnitario: a.precioUnitario,
        valorUnitario: a.valorUnitario,
        montoImpuesto: a.montoImpuesto,
        montoOtrosTributos: a.montoOtrosTributos,
        total: a.total,
      })),
    };
  }

  private async persistirDocumento(
    tx: TxPrisma,
    inquilinoId: string,
    entrada: {
      empresaId: string;
      sucursalId: string;
      ventaId: string | null;
      seriesId: string;
      documentType: TipoDocumentoElectronico;
      series: string;
      numero: bigint;
      moneda: string;
      customerDocumentType: TipoDocumentoIdentidad | null;
      customerDocumentNumber: string | null;
      construido: ComprobanteConstruido;
      nota?: {
        motivoCodigo: string;
        motivoTexto: string;
        relatedDocumentType: TipoDocumentoElectronico;
        relatedSeries: string;
        relatedNumber: bigint;
      };
    },
  ) {
    const { construido, nota } = entrada;
    const doc = await tx.electronicDocument.create({
      data: {
        inquilinoId,
        empresaId: entrada.empresaId,
        sucursalId: entrada.sucursalId,
        ventaId: entrada.ventaId,
        seriesId: entrada.seriesId,
        documentType: entrada.documentType,
        series: entrada.series,
        number: entrada.numero,
        estado: 'EN_COLA',
        customerDocumentType: entrada.customerDocumentType ?? null,
        customerDocumentNumber: entrada.customerDocumentNumber,
        customerName: construido.customerSnapshot.razonSocial,
        issuerSnapshot:
          construido.issuerSnapshot as unknown as Prisma.InputJsonValue,
        customerSnapshot:
          construido.customerSnapshot as unknown as Prisma.InputJsonValue,
        moneda: entrada.moneda,
        subtotal: construido.totales.subtotal,
        taxableTotal: construido.totales.taxableTotal,
        exemptTotal: construido.totales.exemptTotal,
        unaffectedTotal: construido.totales.unaffectedTotal,
        freeTotal: construido.totales.freeTotal,
        totalDescuento: construido.totales.totalDescuento,
        totalImpuesto: construido.totales.totalImpuesto,
        otrosTributos: construido.totales.otrosTributos,
        total: construido.totales.total,
        issueDate: new Date(),
        paymentTerms: 'CONTADO',
        noteReasonCode: nota?.motivoCodigo ?? null,
        noteReasonText: nota?.motivoTexto ?? null,
        relatedDocumentType: nota?.relatedDocumentType ?? null,
        relatedSeries: nota?.relatedSeries ?? null,
        relatedNumber: nota?.relatedNumber ?? null,
      },
      select: {
        id: true,
        documentType: true,
        series: true,
        number: true,
        estado: true,
      },
    });

    for (const item of construido.items) {
      await tx.electronicDocumentItem.create({
        data: {
          inquilinoId,
          documentoElectronicoId: doc.id,
          lineNumber: item.lineNumber,
          varianteId: item.varianteId,
          sku: item.sku,
          descripcion: item.descripcion,
          sunatUnitCode: item.sunatUnitCode,
          affectation: item.affectation,
          taxSchemeId: item.taxSchemeId,
          taxSchemeName: item.taxSchemeName,
          taxCategoryCode: item.taxCategoryCode,
          priceTypeCode: item.priceTypeCode,
          taxPercent: item.taxPercent,
          cantidad: item.cantidad,
          valorUnitario: item.valorUnitario,
          precioUnitario: item.precioUnitario,
          discountAmount: item.discountAmount,
          taxableBase: item.taxableBase,
          montoImpuesto: item.montoImpuesto,
          montoOtrosTributos: item.montoOtrosTributos,
          total: item.total,
        },
      });
    }

    for (const leyenda of construido.leyendas) {
      await tx.electronicDocumentLegend.create({
        data: {
          inquilinoId,
          documentoElectronicoId: doc.id,
          codigo: leyenda.codigo,
          valor: leyenda.valor,
        },
      });
    }

    await tx.electronicDocumentEvent.create({
      data: {
        inquilinoId,
        documentoElectronicoId: doc.id,
        estado: 'EN_COLA',
        eventType: 'ENCOLADO',
        message: 'Comprobante generado y encolado para envío',
      },
    });

    await this.encolar(tx, inquilinoId, doc.id, 'emision');
    return doc;
  }

  /** Reserves the next correlative under a row lock; verifies series type. */
  private async reservarCorrelativo(
    tx: TxPrisma,
    inquilinoId: string,
    serieId: string,
    tipoEsperado: TipoDocumentoElectronico,
  ): Promise<SerieReservada> {
    const filas = await tx.$queryRaw<
      {
        series: string;
        nextNumber: bigint;
        documentType: string;
        empresaId: string;
      }[]
    >`SELECT "series", "nextNumber", "documentType", "empresaId" FROM "DocumentSeries"
      WHERE "id" = ${serieId}::uuid AND "inquilinoId" = ${inquilinoId}::uuid AND "estado" = 'ACTIVO'
      FOR UPDATE`;
    if (filas.length === 0) {
      throw new NotFoundException(
        'Serie de documento no encontrada o inactiva',
      );
    }
    if (filas[0].documentType !== tipoEsperado) {
      throw new ConflictException(
        `La serie es de tipo ${filas[0].documentType}, no ${tipoEsperado}`,
      );
    }
    await tx.$executeRaw`UPDATE "DocumentSeries"
      SET "nextNumber" = "nextNumber" + 1, "actualizadoEn" = now()
      WHERE "id" = ${serieId}::uuid AND "inquilinoId" = ${inquilinoId}::uuid`;
    return {
      series: filas[0].series,
      numero: filas[0].nextNumber,
      empresaId: filas[0].empresaId,
    };
  }

  private async encolar(
    tx: TxPrisma,
    inquilinoId: string,
    documentoId: string,
    causa: string,
  ) {
    await tx.outboxEvent.create({
      data: {
        inquilinoId,
        aggregateType: 'ElectronicDocument',
        aggregateId: documentoId,
        eventType: 'fiscal.comprobante.emitir',
        idempotencyKey: `fiscal:emitir:${documentoId}:${causa}`,
        carga: { documentoId },
      },
    });
  }

  /** Persists a provider verdict onto the document, guarded by the FSM. */
  private async registrarResultado(
    inquilinoId: string,
    documentoId: string,
    estadoActual: DocEstado,
    datos: {
      estado: DocEstado;
      eventType: string;
      message: string | null;
      resultado?: ResultadoEmision;
    },
  ) {
    await this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const destino = puedeTransicionar(estadoActual, datos.estado)
        ? datos.estado
        : estadoActual;
      const aceptado =
        destino === 'ACEPTADO' || destino === 'ACEPTADO_CON_OBSERVACIONES';
      await tx.electronicDocument.update({
        where: { id: documentoId },
        data: {
          estado: destino,
          sunatTicket: datos.resultado?.ticket ?? undefined,
          sunatResponseCode: datos.resultado?.codigoRespuesta ?? undefined,
          sunatDescription: datos.resultado?.descripcion ?? undefined,
          enviadoEn: datos.resultado ? new Date() : undefined,
          aceptadoEn: aceptado ? new Date() : undefined,
        },
      });
      await tx.electronicDocumentEvent.create({
        data: {
          inquilinoId,
          documentoElectronicoId: documentoId,
          estado: destino,
          eventType: datos.eventType,
          message: datos.message,
          cargaRespuesta: (datos.resultado?.crudo as object) ?? undefined,
        },
      });
    });
  }

  private aSolicitud(doc: DocParaEmitir): SolicitudEmision {
    const emisor = doc.issuerSnapshot as unknown as SolicitudEmision['emisor'];
    const clienteSnap = doc.customerSnapshot as unknown as {
      razonSocial: string;
      direccion: string | null;
    };
    return {
      documentoId: doc.id,
      tipo: doc.documentType,
      tipoCodigo: TIPO_DOC_SUNAT[doc.documentType],
      serie: doc.series,
      numero: doc.number.toString().padStart(8, '0'),
      moneda: doc.moneda,
      fechaEmision: doc.issueDate,
      fechaVencimiento: doc.dueDate,
      emisor,
      cliente: {
        tipoDocumento: doc.customerDocumentType
          ? DOC_IDENTIDAD_SUNAT[doc.customerDocumentType]
          : null,
        numeroDocumento: doc.customerDocumentNumber,
        razonSocial: clienteSnap.razonSocial,
        direccion: clienteSnap.direccion ?? null,
      },
      totales: {
        gravado: doc.taxableTotal.toFixed(2),
        exonerado: doc.exemptTotal.toFixed(2),
        inafecto: doc.unaffectedTotal.toFixed(2),
        gratuito: doc.freeTotal.toFixed(2),
        descuento: doc.totalDescuento.toFixed(2),
        igv: doc.totalImpuesto.toFixed(2),
        icbper: doc.otrosTributos.toFixed(2),
        total: doc.total.toFixed(2),
      },
      items: doc.articulos.map((a) => ({
        lineNumber: a.lineNumber,
        descripcion: a.descripcion,
        codigoUnidad: a.sunatUnitCode,
        cantidad: a.cantidad.toFixed(6),
        valorUnitario: a.valorUnitario.toFixed(6),
        precioUnitario: a.precioUnitario.toFixed(6),
        tipoAfectacion: a.affectation ? AFECTACION_CODE(a.affectation) : '30',
        tipoPrecio: a.priceTypeCode,
        porcentajeImpuesto: a.taxPercent.toFixed(2),
        baseImponible: a.taxableBase.toFixed(2),
        montoImpuesto: a.montoImpuesto.toFixed(2),
        montoIcbper: a.montoOtrosTributos.toFixed(2),
        factorIcbper: a.cantidad.isZero()
          ? '0.00'
          : a.montoOtrosTributos.div(a.cantidad).toFixed(2),
        total: a.total.toFixed(2),
      })),
      leyendas: doc.leyendas.map((l) => ({ codigo: l.codigo, valor: l.valor })),
      nota: doc.noteReasonCode
        ? {
            motivoCodigo: doc.noteReasonCode,
            motivoTexto: doc.noteReasonText ?? '',
            docRelacionadoTipo: doc.relatedDocumentType
              ? TIPO_DOC_SUNAT[doc.relatedDocumentType]
              : '01',
            docRelacionadoSerie: doc.relatedSeries ?? '',
            docRelacionadoNumero:
              doc.relatedNumber?.toString().padStart(8, '0') ?? '',
          }
        : null,
    };
  }

  private resumen(doc: DocResumen, idempotente: boolean) {
    return {
      id: doc.id,
      tipo: doc.documentType,
      serie: doc.series,
      numero: doc.number.toString().padStart(8, '0'),
      estado: doc.estado,
      idempotente,
    };
  }
}

// Local helper: SUNAT afectación code from our enum (mirrors AFECTACION_SUNAT).
function AFECTACION_CODE(a: AfectacionImpuesto): string {
  return AFECTACION_SUNAT[a].tipoAfectacion;
}

// ---- structural types over Prisma payloads --------------------------------

type DocEstado = Prisma.ElectronicDocumentGetPayload<object>['estado'];

type SaleConDetalle = Prisma.SaleGetPayload<{
  include: {
    articulos: true;
    company: true;
    customer: true;
  };
}>;

type DocResumen = Pick<
  Prisma.ElectronicDocumentGetPayload<object>,
  'id' | 'documentType' | 'series' | 'number' | 'estado'
>;

type DocParaEmitir = Prisma.ElectronicDocumentGetPayload<{
  include: { articulos: true; leyendas: true };
}>;
