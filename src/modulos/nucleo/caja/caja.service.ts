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
import { MovimientoCajaDto } from './dto/movimiento-caja.dto';
import { randomUUID } from 'node:crypto';

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

      // Guarda explícita: una caja no puede tener dos sesiones abiertas a la vez.
      // (El schema no tiene un unique parcial; no basta con atrapar P2002.)
      const yaAbierta = await tx.cashSession.findFirst({
        where: { inquilinoId, cajaId: dto.cajaId, estado: 'ABIERTA' },
        select: { id: true },
      });
      if (yaAbierta) {
        throw new ConflictException('La caja ya tiene una sesión abierta');
      }

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

  /** Sesión ABIERTA de una sucursal (para el POS), o null si no hay. */
  async sesionAbierta(sucursalId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sesion = await tx.cashSession.findFirst({
        where: { inquilinoId, sucursalId, estado: 'ABIERTA' },
        select: {
          id: true,
          cajaId: true,
          sucursalId: true,
          abiertoEn: true,
          openingAmount: true,
          cashRegister: { select: { codigo: true, nombre: true } },
        },
        orderBy: { abiertoEn: 'desc' },
      });
      return sesion;
    });
  }

  /** Sesiones recientes de una sucursal (abiertas y cerradas) para historial. */
  async listarSesiones(sucursalId: string, limite = 20) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    const take = Math.min(Math.max(limite, 1), 100);
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sesiones = await tx.cashSession.findMany({
        where: { inquilinoId, sucursalId },
        select: {
          id: true,
          cajaId: true,
          estado: true,
          abiertoEn: true,
          cerradoEn: true,
          abiertoPorId: true,
          cerradoPorId: true,
          openingAmount: true,
          expectedAmount: true,
          declaredAmount: true,
          differenceAmount: true,
          cashRegister: { select: { codigo: true, nombre: true } },
        },
        orderBy: { abiertoEn: 'desc' },
        take,
      });

      // Nombres de quién abrió/cerró (abiertoPorId/cerradoPorId → UserIdentity).
      const idsUsuarios = [
        ...new Set(
          sesiones
            .flatMap((s) => [s.abiertoPorId, s.cerradoPorId])
            .filter((id): id is string => !!id),
        ),
      ];
      const usuarios = idsUsuarios.length
        ? await tx.userIdentity.findMany({
            where: { inquilinoId, id: { in: idsUsuarios } },
            select: { id: true, nombreVisible: true },
          })
        : [];
      const nombre = new Map(usuarios.map((u) => [u.id, u.nombreVisible]));

      return sesiones.map((s) => ({
        id: s.id,
        cajaId: s.cajaId,
        estado: s.estado,
        abiertoEn: s.abiertoEn,
        cerradoEn: s.cerradoEn,
        abiertoPor: nombre.get(s.abiertoPorId) ?? null,
        cerradoPor: s.cerradoPorId ? (nombre.get(s.cerradoPorId) ?? null) : null,
        caja: s.cashRegister,
        montoApertura: s.openingAmount.toFixed(2),
        efectivoEsperado: s.expectedAmount?.toFixed(2) ?? null,
        montoDeclarado: s.declaredAmount?.toFixed(2) ?? null,
        diferencia: s.differenceAmount?.toFixed(2) ?? null,
      }));
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

  /**
   * Registra un movimiento manual de efectivo (ingreso, egreso o retiro) en una
   * sesión abierta. El signo lo aplica `calcularEsperado` según el tipo.
   */
  async registrarMovimiento(dto: MovimientoCajaDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      // FOR UPDATE serializa contra un cierre concurrente: si la sesión se está
      // cerrando, este movimiento espera y luego ve CONCILIADA (rechazado); sin
      // el lock, el efectivo entraría fuera del arqueo ya conciliado.
      const filas = await tx.$queryRaw<
        { estado: string; sucursalId: string }[]
      >`
        SELECT "estado", "sucursalId" FROM "CashSession"
        WHERE "id" = ${dto.sesionCajaId}::uuid AND "inquilinoId" = ${inquilinoId}::uuid
        FOR UPDATE`;
      if (filas.length === 0) {
        throw new NotFoundException('Sesión de caja no encontrada');
      }
      const sesion = filas[0];
      if (sesion.estado !== 'ABIERTA') {
        throw new ConflictException(
          `La sesión no está abierta (estado ${sesion.estado})`,
        );
      }
      // Alcance por sucursal: mover efectivo requiere poder abrir caja allí.
      await this.autorizacion.exigirEnSucursal('caja.abrir', sesion.sucursalId);

      await tx.cashMovement.create({
        data: {
          inquilinoId,
          sesionCajaId: dto.sesionCajaId,
          idempotencyKey: `manual:${randomUUID()}`,
          tipo: dto.tipo,
          monto: new Prisma.Decimal(dto.monto),
          moneda: 'PEN',
          motivo: dto.motivo ?? null,
          actorId: identidadUsuarioId,
        },
      });

      const esperado = await this.calcularEsperado(
        tx,
        inquilinoId,
        dto.sesionCajaId,
      );
      return {
        sesionCajaId: dto.sesionCajaId,
        tipo: dto.tipo,
        efectivoEsperado: esperado.toFixed(2),
      };
    });
  }

  /** Movimientos de efectivo de una sesión, más recientes primero. */
  async movimientos(sesionCajaId: string) {
    const { inquilinoId } = this.contexto.obtenerObligatorio();
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const sesion = await tx.cashSession.findFirst({
        where: { id: sesionCajaId, inquilinoId },
        select: { id: true },
      });
      if (!sesion) throw new NotFoundException('Sesión de caja no encontrada');
      const movimientos = await tx.cashMovement.findMany({
        where: { inquilinoId, sesionCajaId },
        select: {
          id: true,
          tipo: true,
          monto: true,
          motivo: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: 'desc' },
      });
      return movimientos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        monto: m.monto.toFixed(2),
        signo: SIGNO_MOVIMIENTO[m.tipo] ?? 0,
        motivo: m.motivo,
        occurredAt: m.occurredAt,
      }));
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
