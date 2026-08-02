import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MetodoPago, Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { CifradoService } from '../../../compartido/seguridad/cifrado.service';
import { CrearIntentoDto, RegistrarCuentaProveedorDto } from './dto/pagos.dto';
import { PROVEEDOR_PAGO, ProveedorPago } from './proveedor/proveedor-pago';

/**
 * Rail de pagos con billetera/tarjeta. Un intento (PaymentIntent) se cobra vía
 * la pasarela pluggable, generando una PaymentTransaction; los pagos asíncronos
 * (Yape/QR) se confirman por webhook. Toda I/O externa vive en ProveedorPago.
 */
@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly cifrado: CifradoService,
    @Inject(PROVEEDOR_PAGO) private readonly proveedor: ProveedorPago,
  ) {}

  /** Registra las credenciales de una pasarela para un comercio del tenant. */
  async registrarCuenta(dto: RegistrarCuentaProveedorDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.paymentProviderAccount.upsert({
        where: {
          inquilinoId_proveedor_referenciaComerciante: {
            inquilinoId,
            proveedor: dto.proveedor,
            referenciaComerciante: dto.referenciaComerciante,
          },
        },
        update: {
          referenciaSecretaCifrada: dto.referenciaSecreta
            ? this.cifrado.cifrar(dto.referenciaSecreta)
            : undefined,
          settings: (dto.settings as Prisma.InputJsonValue) ?? undefined,
        },
        create: {
          inquilinoId,
          empresaId: dto.empresaId,
          proveedor: dto.proveedor,
          referenciaComerciante: dto.referenciaComerciante,
          referenciaSecretaCifrada: dto.referenciaSecreta
            ? this.cifrado.cifrar(dto.referenciaSecreta)
            : null,
          settings: (dto.settings as Prisma.InputJsonValue) ?? undefined,
        },
        select: { id: true, proveedor: true, estado: true },
      }),
    );
  }

  /** Crea un intento y lo cobra en la pasarela; idempotente por idempotencyKey. */
  async crearIntento(dto: CrearIntentoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.paymentIntent.findFirst({
        where: { inquilinoId, idempotencyKey: dto.idempotencyKey },
        select: { id: true, estado: true },
      });
      if (existente) return { ...existente, idempotente: true };

      const cuenta = dto.cuentaProveedorId
        ? await tx.paymentProviderAccount.findFirst({
            where: { id: dto.cuentaProveedorId, inquilinoId, estado: 'ACTIVO' },
            select: { id: true, referenciaSecretaCifrada: true },
          })
        : await tx.paymentProviderAccount.findFirst({
            where: {
              inquilinoId,
              proveedor: this.proveedor.nombre,
              estado: 'ACTIVO',
            },
            select: { id: true, referenciaSecretaCifrada: true },
          });

      const intento = await tx.paymentIntent.create({
        data: {
          inquilinoId,
          cuentaProveedorId: cuenta?.id ?? null,
          idempotencyKey: dto.idempotencyKey,
          monto: new Prisma.Decimal(dto.monto),
          moneda: dto.moneda,
          method: dto.method,
          descripcion: dto.descripcion ?? null,
          metadata: dto.ventaId ? { ventaId: dto.ventaId } : undefined,
        },
        select: { id: true },
      });

      const resultado = await this.proveedor.crearCargo({
        intentoId: intento.id,
        monto: dto.monto,
        moneda: dto.moneda,
        method: dto.method,
        descripcion: dto.descripcion ?? null,
        fuente: dto.fuente ?? null,
        email: dto.email ?? null,
        metadata: dto.ventaId ? { ventaId: dto.ventaId } : null,
        credencialSecreta: cuenta?.referenciaSecretaCifrada
          ? this.cifrado.descifrar(cuenta.referenciaSecretaCifrada)
          : null,
      });

      const transaccion = await tx.paymentTransaction.create({
        data: {
          inquilinoId,
          intentoPagoId: intento.id,
          idempotencyKey: `${dto.idempotencyKey}:txn`,
          transaccionProveedorId: resultado.transaccionProveedorId,
          estado: resultado.estadoTransaccion,
          monto: new Prisma.Decimal(dto.monto),
          moneda: dto.moneda,
          codigoAutorizacion: resultado.codigoAutorizacion,
          codigoError: resultado.codigoError,
          mensajeError: resultado.mensajeError,
          procesadoEn: new Date(),
        },
        select: { id: true, estado: true },
      });

      await tx.paymentIntent.update({
        where: { id: intento.id },
        data: {
          estado: resultado.estadoIntento,
          intentoProveedorId: resultado.transaccionProveedorId,
        },
      });

      if (resultado.estadoTransaccion === 'CAPTURADA' && dto.ventaId) {
        await this.conciliarConVenta(tx, inquilinoId, {
          ventaId: dto.ventaId,
          transaccionId: transaccion.id,
          monto: dto.monto,
          moneda: dto.moneda,
          method: dto.method,
          idempotencyKey: `${dto.idempotencyKey}:salepay`,
        });
      }

      return {
        intentoId: intento.id,
        transaccionId: transaccion.id,
        estado: resultado.estadoIntento,
        estadoTransaccion: transaccion.estado,
        idempotente: false,
      };
    });
  }

  /**
   * Concilia un pago de pasarela con la venta del POS: crea el SalePayment ligado
   * a la transacción. Idempotente por clave; no rompe el pago si la venta aún no
   * existe (el POS puede crearla antes o después).
   */
  private async conciliarConVenta(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    datos: {
      ventaId: string;
      transaccionId: string;
      monto: string;
      moneda: string;
      method: MetodoPago;
      idempotencyKey: string;
    },
  ): Promise<void> {
    const existe = await tx.salePayment.findFirst({
      where: { inquilinoId, idempotencyKey: datos.idempotencyKey },
      select: { id: true },
    });
    if (existe) return;
    const venta = await tx.sale.findFirst({
      where: { id: datos.ventaId, inquilinoId },
      select: { id: true },
    });
    if (!venta) return;
    await tx.salePayment.create({
      data: {
        inquilinoId,
        ventaId: datos.ventaId,
        transaccionPagoId: datos.transaccionId,
        idempotencyKey: datos.idempotencyKey,
        method: datos.method,
        monto: new Prisma.Decimal(datos.monto),
        moneda: datos.moneda,
        referencia: 'pasarela',
      },
    });
  }

  async consultarIntento(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const intento = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.paymentIntent.findFirst({
        where: { id, inquilinoId },
        include: {
          transactions: { orderBy: { creadoEn: 'desc' } },
        },
      }),
    );
    if (!intento) throw new NotFoundException('Intento de pago no encontrado');
    return intento;
  }

  /**
   * Procesa un webhook entrante de la pasarela (sin JWT). Resuelve el tenant por
   * la cuenta del comercio, guarda el evento y actualiza la transacción/intento.
   *
   * NOTA (RLS): la búsqueda de la cuenta corre sin contexto de tenant; requiere
   * rol DB exento de RLS en PaymentProviderAccount (o el runtime como owner). Las
   * escrituras posteriores sí van tenant-scoped. Ver memoria rls-activacion-pos-app.
   */
  async procesarWebhook(
    proveedorNombre: string,
    cuerpo: Buffer,
    headers: Record<string, string>,
  ) {
    const evento = this.proveedor.interpretarWebhook(cuerpo, headers);
    if (!evento.referenciaComerciante) {
      throw new ConflictException(
        'El webhook no identifica al comercio (referenciaComerciante)',
      );
    }

    const cuenta = await this.prisma.paymentProviderAccount.findFirst({
      where: {
        proveedor: proveedorNombre,
        referenciaComerciante: evento.referenciaComerciante,
      },
      select: { id: true, inquilinoId: true, referenciaSecretaCifrada: true },
    });
    if (!cuenta) {
      throw new NotFoundException('Cuenta de proveedor no encontrada');
    }

    // Verifica la autenticidad del webhook con la firma del proveedor.
    if (
      !this.proveedor.verificarFirma(
        cuerpo,
        headers,
        cuenta.referenciaSecretaCifrada
          ? this.cifrado.descifrar(cuenta.referenciaSecretaCifrada)
          : null,
      )
    ) {
      throw new ForbiddenException('Firma de webhook inválida');
    }

    return this.prisma.ejecutarEnTenant(cuenta.inquilinoId, async (tx) => {
      const yaProcesado = await tx.paymentWebhookEvent.findFirst({
        where: {
          inquilinoId: cuenta.inquilinoId,
          cuentaProveedorId: cuenta.id,
          eventoProveedorId: evento.eventoProveedorId,
        },
        select: { id: true, procesadoEn: true },
      });
      if (yaProcesado?.procesadoEn) {
        return { procesado: true, duplicado: true };
      }

      await tx.paymentWebhookEvent.upsert({
        where: {
          inquilinoId_cuentaProveedorId_eventoProveedorId: {
            inquilinoId: cuenta.inquilinoId,
            cuentaProveedorId: cuenta.id,
            eventoProveedorId: evento.eventoProveedorId,
          },
        },
        update: {},
        create: {
          inquilinoId: cuenta.inquilinoId,
          cuentaProveedorId: cuenta.id,
          eventoProveedorId: evento.eventoProveedorId,
          eventType: evento.tipo,
          cuerpoCrudo: new Uint8Array(cuerpo),
          encabezados: headers,
        },
      });

      if (evento.transaccionProveedorId && evento.estadoTransaccion) {
        const txn = await tx.paymentTransaction.findFirst({
          where: {
            inquilinoId: cuenta.inquilinoId,
            transaccionProveedorId: evento.transaccionProveedorId,
          },
          select: { id: true, intentoPagoId: true },
        });
        if (txn) {
          await tx.paymentTransaction.update({
            where: { id: txn.id },
            data: { estado: evento.estadoTransaccion, procesadoEn: new Date() },
          });
          if (evento.estadoIntento) {
            await tx.paymentIntent.update({
              where: { id: txn.intentoPagoId },
              data: { estado: evento.estadoIntento },
            });
          }
          if (evento.estadoTransaccion === 'CAPTURADA') {
            const intent = await tx.paymentIntent.findUnique({
              where: { id: txn.intentoPagoId },
              select: {
                idempotencyKey: true,
                method: true,
                monto: true,
                moneda: true,
                metadata: true,
              },
            });
            const ventaId = (intent?.metadata as { ventaId?: string } | null)
              ?.ventaId;
            if (intent && ventaId) {
              await this.conciliarConVenta(tx, cuenta.inquilinoId, {
                ventaId,
                transaccionId: txn.id,
                monto: intent.monto.toString(),
                moneda: intent.moneda,
                method: intent.method,
                idempotencyKey: `${intent.idempotencyKey}:salepay`,
              });
            }
          }
        } else {
          this.logger.warn(
            `Webhook sin transacción local: ${evento.transaccionProveedorId}`,
          );
        }
      }

      await tx.paymentWebhookEvent.update({
        where: {
          inquilinoId_cuentaProveedorId_eventoProveedorId: {
            inquilinoId: cuenta.inquilinoId,
            cuentaProveedorId: cuenta.id,
            eventoProveedorId: evento.eventoProveedorId,
          },
        },
        data: { procesadoEn: new Date() },
      });

      return { procesado: true, duplicado: false };
    });
  }
}
