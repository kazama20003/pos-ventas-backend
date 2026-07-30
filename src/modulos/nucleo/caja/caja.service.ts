import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { ContextoSolicitudService } from '../../../compartido/contexto/contexto-solicitud.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';

@Injectable()
export class CajaService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly contexto: ContextoSolicitudService,
  ) {}

  async abrir(dto: AbrirCajaDto) {
    const { inquilinoId, identidadUsuarioId } =
      this.contexto.obtenerObligatorio();
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
}
