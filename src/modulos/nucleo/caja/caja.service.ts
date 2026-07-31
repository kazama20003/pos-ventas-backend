import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { AutorizacionSucursalService } from '../identidad/autorizacion-sucursal.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';

/** Signo de cada tipo de movimiento sobre el efectivo esperado en caja. */
const SIGNO_MOVIMIENTO: Record<string, number> = {
  FONDO_APERTURA: 1,
  VENTA_EFECTIVO: 1,
  INGRESO_EFECTIVO: 1,
  DEVOLUCION_EFECTIVO: -1,
  EGRESO_EFECTIVO: -1,
  RETIRO: -1,
  AJUSTE_CIERRE: 1,
};

@Injectable()
export class CajaService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
    private readonly autorizacion: AutorizacionSucursalService,
  ) {}

  async abrir(dto: AbrirCajaDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    // Alcance por sucursal: solo puede abrir caja en sucursales permitidas.
    await this.autorizacion.exigirEnSucursal('caja.abrir', dto.sucursalId);
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const caja = await tx.cashRegister.findFirst({
        where: {
          id: dto.cajaId,
          sucursalId: dto.sucursalId,
          inquilinoId,
          estado: 'ACTIVO',
        },
        select: { id: true },
      });
      if (!caja) throw new NotFoundException('Caja no encontrada o inactiva');
      try {
        const sesion = await tx.cashSession.create({
          data: {
            inquilinoId,
            sucursalId: dto.sucursalId,
            cajaId: dto.cajaId,
            terminalId: dto.terminalId ?? null,
            abiertoPorId: identidadUsuarioId,
            openingAmount: new Prisma.Decimal(dto.montoApertura),
          },
          select: { id: true, estado: true, abiertoEn: true },
        });
        await tx.cashMovement.create({
          data: {
            inquilinoId,
            sesionCajaId: sesion.id,
            idempotencyKey: `apertura:${sesion.id}`,
            tipo: 'FONDO_APERTURA',
            monto: new Prisma.Decimal(dto.montoApertura),
            moneda: 'PEN',
            actorId: identidadUsuarioId,
          },
        });
        return sesion;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('La caja ya tiene una sesión abierta');
        }
        throw error;
      }
    });
  }

  /** Efectivo esperado en una sesión = suma firmada de sus movimientos. */
  async resumen(sesionCajaId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sesion = await tx.cashSession.findFirst({
        where: { id: sesionCajaId, inquilinoId },
        select: {
          id: true,
          estado: true,
          openingAmount: true,
          abiertoEn: true,
        },
      });
      if (!sesion) throw new NotFoundException('Sesión de caja no encontrada');
      const esperado = await this.calcularEsperado(
        tx,
        inquilinoId,
        sesionCajaId,
      );
      return {
        id: sesion.id,
        estado: sesion.estado,
        abiertoEn: sesion.abiertoEn,
        montoApertura: sesion.openingAmount.toFixed(2),
        efectivoEsperado: esperado.toFixed(2),
      };
    });
  }

  /**
   * Cierra y concilia una sesión de caja: calcula el efectivo esperado, lo
   * compara con lo declarado, guarda el arqueo por denominación y crea la
   * conciliación con la diferencia (sobrante/faltante).
   */
  async cerrar(dto: CerrarCajaDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const filas = await tx.$queryRaw<{ estado: string }[]>`
        SELECT "estado" FROM "CashSession"
        WHERE "id" = ${dto.sesionCajaId}::uuid AND "inquilinoId" = ${inquilinoId}::uuid
        FOR UPDATE`;
      if (filas.length === 0) {
        throw new NotFoundException('Sesión de caja no encontrada');
      }
      if (filas[0].estado !== 'ABIERTA') {
        throw new ConflictException(
          `La sesión no está abierta (estado ${filas[0].estado})`,
        );
      }

      const esperado = await this.calcularEsperado(
        tx,
        inquilinoId,
        dto.sesionCajaId,
      );
      const declarado = new Prisma.Decimal(dto.montoDeclarado);
      const diferencia = declarado.sub(esperado);

      for (const conteo of dto.conteos ?? []) {
        const denom = new Prisma.Decimal(conteo.denominacion);
        await tx.cashCount.create({
          data: {
            inquilinoId,
            sesionCajaId: dto.sesionCajaId,
            denomination: denom,
            cantidad: conteo.cantidad,
            total: denom.mul(conteo.cantidad),
            contadoPorId: identidadUsuarioId,
          },
        });
      }

      await tx.cashSession.update({
        where: { id: dto.sesionCajaId },
        data: {
          estado: 'CONCILIADA',
          cerradoPorId: identidadUsuarioId,
          expectedAmount: esperado,
          declaredAmount: declarado,
          differenceAmount: diferencia,
          cerradoEn: new Date(),
        },
      });

      await tx.cashReconciliation.create({
        data: {
          inquilinoId,
          sesionCajaId: dto.sesionCajaId,
          expectedAmount: esperado,
          declaredAmount: declarado,
          differenceAmount: diferencia,
          motivo: dto.motivo ?? null,
          reconciledById: identidadUsuarioId,
        },
      });

      return {
        id: dto.sesionCajaId,
        estado: 'CONCILIADA' as const,
        efectivoEsperado: esperado.toFixed(2),
        montoDeclarado: declarado.toFixed(2),
        diferencia: diferencia.toFixed(2),
      };
    });
  }

  private async calcularEsperado(
    tx: Prisma.TransactionClient,
    inquilinoId: string,
    sesionCajaId: string,
  ): Promise<Prisma.Decimal> {
    const movimientos = await tx.cashMovement.findMany({
      where: { inquilinoId, sesionCajaId },
      select: { tipo: true, monto: true },
    });
    return movimientos.reduce(
      (acc, m) => acc.add(m.monto.mul(SIGNO_MOVIMIENTO[m.tipo] ?? 0)),
      new Prisma.Decimal(0),
    );
  }
}
