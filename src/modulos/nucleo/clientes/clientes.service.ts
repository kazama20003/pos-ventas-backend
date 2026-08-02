import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import {
  ActualizarClienteDto,
  CrearClienteDto,
  CuentaCreditoDto,
  RegistrarCobroDto,
} from './dto/clientes.dto';

/**
 * Clientes (CRM) y cuentas por cobrar. CRUD de Customer, cuentas de crédito, y
 * registro de cobros que aplican efectivo contra las cuotas de una cuenta por
 * cobrar (AccountsReceivable) manteniendo las proyecciones de saldo.
 */
@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async crear(dto: CrearClienteDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const duplicado = await tx.customer.findFirst({
        where: { inquilinoId, codigo: dto.codigo },
        select: { id: true },
      });
      if (duplicado) {
        throw new ConflictException(
          `Ya existe un cliente con código ${dto.codigo}`,
        );
      }
      return tx.customer.create({
        data: {
          inquilinoId,
          codigo: dto.codigo,
          tipo: dto.tipo,
          documentType: dto.documentType ?? null,
          documentNumber: dto.documentNumber ?? null,
          razonSocial: dto.razonSocial,
          nombreComercial: dto.nombreComercial ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          defaultCurrency: dto.defaultCurrency ?? 'PEN',
        },
        select: { id: true, codigo: true, razonSocial: true, estado: true },
      });
    });
  }

  async listar(q?: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.customer.findMany({
        where: {
          inquilinoId,
          estado: { not: 'ELIMINADO' },
          ...(q
            ? {
                OR: [
                  { razonSocial: { contains: q, mode: 'insensitive' } },
                  { codigo: { contains: q, mode: 'insensitive' } },
                  { documentNumber: { contains: q } },
                ],
              }
            : {}),
        },
        orderBy: { razonSocial: 'asc' },
        take: 100,
        select: {
          id: true,
          codigo: true,
          tipo: true,
          documentType: true,
          documentNumber: true,
          razonSocial: true,
          email: true,
          phone: true,
          estado: true,
        },
      }),
    );
  }

  async obtener(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const cliente = await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.customer.findFirst({
        where: { id, inquilinoId },
        include: { addresses: true, cuentasCredito: true },
      }),
    );
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async actualizar(id: string, dto: ActualizarClienteDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirCliente(tx, inquilinoId, id);
      return tx.customer.update({
        where: { id },
        data: {
          razonSocial: dto.razonSocial ?? undefined,
          nombreComercial: dto.nombreComercial ?? undefined,
          email: dto.email ?? undefined,
          phone: dto.phone ?? undefined,
        },
        select: { id: true, razonSocial: true, estado: true },
      });
    });
  }

  async desactivar(id: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirCliente(tx, inquilinoId, id);
      await tx.customer.update({
        where: { id },
        data: { estado: 'INACTIVO' },
      });
      return { id, estado: 'INACTIVO' as const };
    });
  }

  /** Crea o actualiza la línea de crédito del cliente en una moneda. */
  async definirCuentaCredito(clienteId: string, dto: CuentaCreditoDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      await this.exigirCliente(tx, inquilinoId, clienteId);
      const creditLimit = new Prisma.Decimal(dto.creditLimit);
      return tx.customerCreditAccount.upsert({
        where: {
          inquilinoId_clienteId_moneda: {
            inquilinoId,
            clienteId,
            moneda: dto.moneda,
          },
        },
        update: {
          creditLimit,
          paymentTermDays: dto.paymentTermDays ?? undefined,
        },
        create: {
          inquilinoId,
          clienteId,
          moneda: dto.moneda,
          creditLimit,
          paymentTermDays: dto.paymentTermDays ?? 0,
        },
      });
    });
  }

  /** Cuentas por cobrar abiertas de un cliente, con sus cuotas. */
  async cuentasPorCobrar(clienteId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.accountsReceivable.findMany({
        where: {
          inquilinoId,
          clienteId,
          estado: { in: ['PENDIENTE', 'PAGADA_PARCIALMENTE', 'VENCIDA'] },
        },
        orderBy: { venceEn: 'asc' },
        include: {
          cuotas: { orderBy: { installmentNo: 'asc' } },
        },
      }),
    );
  }

  /**
   * Aplica un cobro contra cuotas de cuentas por cobrar. Las asignaciones son la
   * fuente de verdad: cada allocation reduce el saldo de su cuota y propaga el
   * saldo pendiente al AccountsReceivable, recalculando ambos estados.
   */
  async registrarCobro(dto: RegistrarCobroDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.receivablePayment.findFirst({
        where: { inquilinoId, idempotencyKey: dto.idempotencyKey },
        select: { id: true, monto: true },
      });
      if (existente) return { ...existente, idempotente: true };

      const totalAsignado = dto.asignaciones.reduce(
        (acc, a) => acc.add(new Prisma.Decimal(a.monto)),
        new Prisma.Decimal(0),
      );
      if (!totalAsignado.equals(new Prisma.Decimal(dto.monto))) {
        throw new BadRequestException(
          'La suma de asignaciones no coincide con el monto del cobro',
        );
      }

      const pago = await tx.receivablePayment.create({
        data: {
          inquilinoId,
          clienteId: dto.clienteId,
          idempotencyKey: dto.idempotencyKey,
          method: dto.method,
          monto: new Prisma.Decimal(dto.monto),
          moneda: dto.moneda,
          referencia: dto.referencia ?? null,
          createdById: identidadUsuarioId,
        },
        select: { id: true },
      });

      const receivablesTocados = new Set<string>();
      for (const asignacion of dto.asignaciones) {
        const cuota = await tx.receivableInstallment.findFirst({
          where: { id: asignacion.cuotaId, inquilinoId },
          select: {
            id: true,
            receivableId: true,
            montoPendiente: true,
          },
        });
        if (!cuota) {
          throw new NotFoundException(
            `Cuota no encontrada: ${asignacion.cuotaId}`,
          );
        }
        const monto = new Prisma.Decimal(asignacion.monto);
        if (monto.gt(cuota.montoPendiente)) {
          throw new ConflictException(
            `El monto asignado supera el saldo de la cuota ${cuota.id}`,
          );
        }
        await tx.receivablePaymentAllocation.create({
          data: {
            inquilinoId,
            paymentId: pago.id,
            installmentId: cuota.id,
            monto,
          },
        });
        const nuevoSaldo = cuota.montoPendiente.sub(monto);
        await tx.receivableInstallment.update({
          where: { id: cuota.id },
          data: {
            montoPendiente: nuevoSaldo,
            estado: nuevoSaldo.lte(0) ? 'PAGADA' : 'PAGADA_PARCIALMENTE',
          },
        });
        receivablesTocados.add(cuota.receivableId);
      }

      for (const receivableId of receivablesTocados) {
        await this.recalcularReceivable(tx, inquilinoId, receivableId);
      }

      return { id: pago.id, idempotente: false };
    });
  }

  private async recalcularReceivable(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    receivableId: string,
  ) {
    const cuotas = await tx.receivableInstallment.findMany({
      where: { inquilinoId, receivableId },
      select: { montoPendiente: true },
    });
    const pendiente = cuotas.reduce(
      (acc, c) => acc.add(c.montoPendiente),
      new Prisma.Decimal(0),
    );
    await tx.accountsReceivable.update({
      where: { id: receivableId },
      data: {
        montoPendiente: pendiente,
        estado: pendiente.lte(0)
          ? 'PAGADA'
          : cuotas.length > 0
            ? 'PAGADA_PARCIALMENTE'
            : 'PENDIENTE',
      },
    });
  }

  private async exigirCliente(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    id: string,
  ) {
    const cliente = await tx.customer.findFirst({
      where: { id, inquilinoId },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
  }
}
