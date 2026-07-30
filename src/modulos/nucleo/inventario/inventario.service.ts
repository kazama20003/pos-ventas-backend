import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { RegistrarStockInicialDto } from './dto/registrar-stock-inicial.dto';

@Injectable()
export class InventarioService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async registrarStockInicial(dto: RegistrarStockInicialDto) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const existente = await tx.inventoryLedgerEntry.findUnique({
        where: {
          inquilinoId_idempotencyKey: {
            inquilinoId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        select: { id: true, almacenId: true, varianteId: true, cantidad: true },
      });
      if (existente) return { ...existente, idempotente: true };

      const [almacen, variante] = await Promise.all([
        tx.warehouse.findFirst({
          where: { id: dto.almacenId, inquilinoId, estado: 'ACTIVO' },
          select: { id: true },
        }),
        tx.productVariant.findFirst({
          where: { id: dto.varianteId, inquilinoId, estado: 'ACTIVO' },
          select: { id: true, isStockTracked: true },
        }),
      ]);
      if (!almacen)
        throw new NotFoundException('Almacén no encontrado o inactivo');
      if (!variante)
        throw new NotFoundException('Variante no encontrada o inactiva');
      if (!variante.isStockTracked)
        throw new ConflictException('La variante no controla inventario');

      const balances = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "StockBalance"
        WHERE "inquilinoId" = ${inquilinoId}::uuid
          AND "almacenId" = ${dto.almacenId}::uuid
          AND "varianteId" = ${dto.varianteId}::uuid
        FOR UPDATE`;
      if (balances.length) {
        throw new ConflictException(
          'La variante ya tiene un saldo inicial en este almacén',
        );
      }

      const cantidad = new Prisma.Decimal(dto.cantidad);
      const costoUnitario = new Prisma.Decimal(dto.costoUnitario);
      const saldo = await tx.stockBalance.create({
        data: {
          inquilinoId,
          almacenId: dto.almacenId,
          varianteId: dto.varianteId,
          enStock: cantidad,
          available: cantidad,
          costoPromedio: costoUnitario,
        },
        select: {
          id: true,
          enStock: true,
          available: true,
          costoPromedio: true,
        },
      });
      const asiento = await tx.inventoryLedgerEntry.create({
        data: {
          inquilinoId,
          almacenId: dto.almacenId,
          varianteId: dto.varianteId,
          movementType: 'APERTURA',
          cantidad,
          costoUnitario,
          totalCost: cantidad.mul(costoUnitario),
          referenciaType: 'APERTURA_INICIAL',
          referenciaId: dto.varianteId,
          idempotencyKey: dto.idempotencyKey,
          occurredAt: new Date(),
        },
        select: { id: true },
      });
      return { ...saldo, asientoId: asiento.id, idempotente: false };
    });
  }
}
