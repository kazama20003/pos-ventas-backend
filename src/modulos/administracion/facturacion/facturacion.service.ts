import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/administracion/client';
import { ManagementPrismaService } from '../../../compartido/base-datos/prisma-administracion.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  CrearCuentaFacturacionDto,
  GenerarFacturaDto,
  RegistrarPagoDto,
} from './dto/facturacion.dto';

/**
 * Facturación del propio SaaS al tenant (tenant-scoped). Genera facturas desde
 * el precio del plan de la suscripción y registra los pagos que las liquidan.
 */
@Injectable()
export class FacturacionService {
  constructor(
    private readonly db: ManagementPrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crearCuenta(dto: CrearCuentaFacturacionDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.billingAccount.create({
        data: {
          inquilinoId,
          nombre: dto.nombre,
          moneda: dto.moneda,
          billingEmail: dto.billingEmail ?? null,
          taxId: dto.taxId ?? null,
          paymentTermsDays: dto.paymentTermsDays ?? 0,
        },
        select: { id: true, nombre: true, moneda: true, estado: true },
      }),
    );
  }

  listarFacturas() {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.invoice.findMany({
        where: { inquilinoId },
        orderBy: { creadoEn: 'desc' },
        take: 100,
        select: {
          id: true,
          number: true,
          estado: true,
          moneda: true,
          total: true,
          montoDue: true,
          montoPaid: true,
          venceEn: true,
          emitidoEn: true,
        },
      }),
    );
  }

  /** Genera una factura por el cargo del plan de la suscripción indicada. */
  async generarFactura(dto: GenerarFacturaDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sub = await tx.subscription.findFirst({
        where: { id: dto.suscripcionId, inquilinoId },
        include: {
          planVersion: {
            include: {
              plan: true,
              prices: { where: { isActive: true, scope: 'VERSION_PLAN' } },
            },
          },
        },
      });
      if (!sub) throw new NotFoundException('Suscripción no encontrada');

      const cuenta = await tx.billingAccount.findFirst({
        where: { inquilinoId, estado: 'ACTIVA' },
        select: { id: true, paymentTermsDays: true },
      });
      if (!cuenta) {
        throw new ConflictException(
          'El tenant no tiene una cuenta de facturación activa',
        );
      }

      const precio = sub.planVersion.prices[0];
      if (!precio) {
        throw new ConflictException('El plan no tiene un precio configurado');
      }

      const monto = new Prisma.Decimal(precio.unitAmount);
      const conteo = await tx.invoice.count({ where: { inquilinoId } });
      const number = `FS-${inquilinoId.slice(0, 8)}-${conteo + 1}`;
      const ahora = new Date();
      const venceEn = new Date(
        ahora.getTime() + cuenta.paymentTermsDays * 24 * 60 * 60 * 1000,
      );

      return tx.invoice.create({
        data: {
          inquilinoId,
          cuentaFacturacionId: cuenta.id,
          suscripcionId: sub.id,
          number,
          estado: 'ABIERTA',
          moneda: precio.moneda,
          subtotal: monto,
          total: monto,
          montoDue: monto,
          periodStartsAt: sub.currentPeriodStartsAt,
          periodEndsAt: sub.currentPeriodEndsAt,
          emitidoEn: ahora,
          venceEn,
          articulos: {
            create: [
              {
                priceId: precio.id,
                descripcion: `Plan ${sub.planVersion.plan.nombre}`,
                cantidad: new Prisma.Decimal(1),
                unitAmount: monto,
                monto,
                periodStartsAt: sub.currentPeriodStartsAt,
                periodEndsAt: sub.currentPeriodEndsAt,
              },
            ],
          },
        },
        select: {
          id: true,
          number: true,
          estado: true,
          total: true,
          venceEn: true,
        },
      });
    });
  }

  /** Registra un pago y liquida (total o parcialmente) la factura. */
  async registrarPago(dto: RegistrarPagoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.db.ejecutarEnTenant(inquilinoId, async (tx) => {
      const factura = await tx.invoice.findFirst({
        where: { id: dto.facturaId, inquilinoId },
        select: {
          id: true,
          cuentaFacturacionId: true,
          moneda: true,
          total: true,
          montoPaid: true,
          estado: true,
        },
      });
      if (!factura) throw new NotFoundException('Factura no encontrada');
      if (factura.estado === 'PAGADA') {
        throw new ConflictException('La factura ya está pagada');
      }

      const proveedor = dto.proveedor ?? 'manual';
      const existente = await tx.payment.findFirst({
        where: { inquilinoId, proveedor, idempotencyKey: dto.idempotencyKey },
        select: { id: true },
      });
      if (existente) return { ...existente, idempotente: true };

      const monto = new Prisma.Decimal(dto.monto);
      await tx.payment.create({
        data: {
          inquilinoId,
          cuentaFacturacionId: factura.cuentaFacturacionId,
          facturaId: factura.id,
          estado: 'EXITOSO',
          proveedor,
          referenciaProveedor: dto.referencia ?? null,
          idempotencyKey: dto.idempotencyKey,
          moneda: factura.moneda,
          monto,
          procesadoEn: new Date(),
        },
      });

      const pagado = new Prisma.Decimal(factura.montoPaid).add(monto);
      const liquidada = pagado.gte(factura.total);
      await tx.invoice.update({
        where: { id: factura.id },
        data: {
          montoPaid: pagado,
          montoDue: liquidada
            ? new Prisma.Decimal(0)
            : new Prisma.Decimal(factura.total).sub(pagado),
          estado: liquidada ? 'PAGADA' : 'ABIERTA',
          pagadoEn: liquidada ? new Date() : null,
        },
      });

      return {
        facturaId: factura.id,
        estado: liquidada ? 'PAGADA' : 'ABIERTA',
        montoPagado: pagado.toString(),
        idempotente: false,
      };
    });
  }
}
