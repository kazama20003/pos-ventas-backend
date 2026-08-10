import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../../../../generado/operaciones/client';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import { generarSlug } from '../../../compartido/utilidades/slug';
import {
  AutenticacionService,
  PREFIJO_GOOGLE,
} from '../identidad/autenticacion.service';
import { CATALOGO_PERMISOS } from '../identidad/catalogo-permisos';
import { VerificadorGoogle } from '../identidad/verificador-google';
import {
  ConfiguracionInicialDto,
  RegistrarEmpresaDto,
} from './dto/registrar.dto';

export type PasoOnboarding =
  | 'producto'
  | 'stock'
  | 'caja'
  | 'venta'
  | 'completado';

export interface EstadoOnboarding {
  descartado: boolean;
  completadoEn: Date | null;
  pasoActual: PasoOnboarding;
  pasos: {
    productoCreado: boolean;
    necesitaStock: boolean;
    stockListo: boolean;
    cajaAbierta: boolean;
    primeraVenta: boolean;
  };
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly google: VerificadorGoogle,
    private readonly auth: AutenticacionService,
  ) {}

  /**
   * Self-service registration. The person registering signs in with Google and
   * becomes the owner/admin of a brand-new tenant: company, org, an ADMIN role
   * holding every permission, and an ACTIVE membership. Returns tokens so they
   * are logged in immediately. This is the only way an admin is created without
   * a prior invitation (solves the bootstrap problem).
   */
  async registrar(dto: RegistrarEmpresaDto) {
    const identidadGoogle = await this.google.verificar(dto.idToken);
    if (!identidadGoogle.emailVerificado) {
      throw new UnauthorizedException('El correo de Google no está verificado');
    }
    const email = identidadGoogle.email;
    const sujetoExterno = `${PREFIJO_GOOGLE}${identidadGoogle.sub}`;
    const nombreAdmin = dto.adminNombre ?? identidadGoogle.nombre ?? email;

    const base = generarSlug(dto.tenantCodigo ?? dto.empresaRazonSocial);

    const resultado = await this.crearTenantConReintento(
      base,
      dto.tenantNombre,
      async (tx, tenant) => {
        // From here every insert must carry this tenant; set the RLS GUC so the
        // policies' WITH CHECK passes for the new tenant's rows.
        await tx.$executeRaw`SELECT set_config('app.inquilino_id', ${tenant.id}, true)`;

        const organizacion = await tx.organization.create({
          data: {
            inquilinoId: tenant.id,
            codigo: 'PRINCIPAL',
            nombre: dto.organizacionNombre,
          },
          select: { id: true },
        });

        const empresa = await tx.company.create({
          data: {
            inquilinoId: tenant.id,
            organizacionId: organizacion.id,
            razonSocial: dto.empresaRazonSocial,
            ruc: dto.empresaRuc,
          },
          select: { id: true },
        });

        if (dto.configuracionInicial === ConfiguracionInicialDto.RAPIDA) {
          const sucursal = await tx.branch.create({
            data: {
              inquilinoId: tenant.id,
              empresaId: empresa.id,
              codigo: 'PRINCIPAL',
              nombre: dto.sucursalNombre ?? 'Sucursal principal',
              address: dto.sucursalDireccion ?? null,
            },
            select: { id: true },
          });
          const almacen = await tx.warehouse.create({
            data: {
              inquilinoId: tenant.id,
              sucursalId: sucursal.id,
              codigo: 'PRINCIPAL',
              nombre: dto.almacenNombre ?? 'Almacén principal',
              tipo: 'PRINCIPAL',
              esPredeterminado: true,
            },
          });
          await tx.cashRegister.create({
            data: {
              inquilinoId: tenant.id,
              sucursalId: sucursal.id,
              almacenId: almacen.id,
              codigo: 'PRINCIPAL',
              nombre: dto.cajaNombre ?? 'Caja principal',
            },
          });
        }

        // Estado del onboarding guiado: se crea desde el registro para que la
        // guía de primera venta aparezca en el dashboard desde el inicio.
        await tx.onboardingState.create({ data: { inquilinoId: tenant.id } });

        await tx.outboxEvent.create({
          data: {
            inquilinoId: tenant.id,
            aggregateType: 'Tenant',
            aggregateId: tenant.id,
            eventType: 'tenant.created',
            idempotencyKey: `tenant.created:${tenant.id}`,
            carga: {
              tenantId: tenant.id,
              slug: tenant.codigo,
              nombreVisible: tenant.nombre,
              razonSocial: dto.empresaRazonSocial,
              region: 'global',
              timezone: 'America/Lima',
              locale: 'es-PE',
            },
          },
        });

        const admin = await tx.userIdentity.create({
          data: {
            inquilinoId: tenant.id,
            sujetoExterno,
            email,
            nombreVisible: nombreAdmin,
            estado: 'ACTIVO',
            ultimoIngresoEn: new Date(),
          },
          select: { id: true, email: true },
        });

        const rolAdmin = await tx.role.create({
          data: {
            inquilinoId: tenant.id,
            codigo: 'ADMIN',
            nombre: 'Administrador',
            descripcion: 'Rol con control total del POS',
            isSystem: true,
          },
          select: { id: true },
        });

        const permisos = await tx.permission.findMany({
          where: { clave: { in: CATALOGO_PERMISOS.map((p) => p.clave) } },
          select: { id: true },
        });
        await tx.rolePermission.createMany({
          data: permisos.map((p) => ({
            inquilinoId: tenant.id,
            rolId: rolAdmin.id,
            permisoId: p.id,
            effect: 'PERMITIR' as const,
          })),
        });

        const membresia = await tx.membership.create({
          data: {
            inquilinoId: tenant.id,
            organizacionId: organizacion.id,
            identidadUsuarioId: admin.id,
            estado: 'ACTIVA',
          },
          select: { id: true },
        });
        await tx.membershipRole.create({
          data: {
            inquilinoId: tenant.id,
            membresiaId: membresia.id,
            rolId: rolAdmin.id,
          },
        });

        return {
          tenantId: tenant.id,
          tenantCodigo: tenant.codigo,
          adminId: admin.id,
          email: admin.email,
        };
      },
    );

    const tokens = await this.auth.emitirTokensParaUsuario({
      identidadUsuarioId: resultado.adminId,
      inquilinoId: resultado.tenantId,
      email: resultado.email,
    });

    return {
      tenant: {
        id: resultado.tenantId,
        codigo: resultado.tenantCodigo,
      },
      admin: { id: resultado.adminId, email: resultado.email },
      tokens,
    };
  }

  /**
   * Estado del onboarding guiado. Deriva el "paso actual" (un solo foco a la
   * vez, sin listas) de datos reales del tenant: crear producto/servicio → dar
   * stock (solo si vende productos físicos) → abrir caja → primera venta. El
   * flag de descartado y la fecha de completado se persisten en OnboardingState.
   */
  async estado(inquilinoId: string): Promise<EstadoOnboarding> {
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      // Tenants creados antes de esta función no tienen fila: se crea perezosa.
      let estado = await tx.onboardingState.findUnique({
        where: { inquilinoId },
      });
      estado ??= await tx.onboardingState.create({ data: { inquilinoId } });

      const [
        productosActivos,
        productosFisicos,
        conStock,
        cajasAbiertas,
        ventas,
      ] = await Promise.all([
        tx.product.count({ where: { inquilinoId, estado: 'ACTIVO' } }),
        tx.product.count({
          where: { inquilinoId, estado: 'ACTIVO', kind: { not: 'SERVICIO' } },
        }),
        tx.stockBalance.count({ where: { inquilinoId, enStock: { gt: 0 } } }),
        tx.cashSession.count({ where: { inquilinoId, estado: 'ABIERTA' } }),
        tx.sale.count({ where: { inquilinoId } }),
      ]);

      const productoCreado = productosActivos > 0;
      const necesitaStock = productosFisicos > 0;
      const stockListo = conStock > 0;
      const cajaAbierta = cajasAbiertas > 0;
      const primeraVenta = ventas > 0;

      const pasoActual: PasoOnboarding = !productoCreado
        ? 'producto'
        : necesitaStock && !stockListo
          ? 'stock'
          : !cajaAbierta
            ? 'caja'
            : !primeraVenta
              ? 'venta'
              : 'completado';

      // Sella la fecha de completado la primera vez que hay una venta.
      if (primeraVenta && !estado.completadoEn) {
        estado = await tx.onboardingState.update({
          where: { inquilinoId },
          data: { completadoEn: new Date() },
        });
      }

      return {
        descartado: estado.descartado,
        completadoEn: estado.completadoEn,
        pasoActual,
        pasos: {
          productoCreado,
          necesitaStock,
          stockListo,
          cajaAbierta,
          primeraVenta,
        },
      };
    });
  }

  /** Marca la guía como descartada (el usuario la cierra). Idempotente. */
  async descartar(inquilinoId: string): Promise<EstadoOnboarding> {
    await this.prisma.ejecutarEnTenant(inquilinoId, (tx) =>
      tx.onboardingState.upsert({
        where: { inquilinoId },
        create: { inquilinoId, descartado: true },
        update: { descartado: true },
      }),
    );
    return this.estado(inquilinoId);
  }

  /**
   * Creates the tenant with a unique code and runs the rest of the onboarding
   * in the same transaction. On a rare code collision (two registrations at
   * once) it retries with the next free candidate; the unique constraint is the
   * final guard.
   */
  private async crearTenantConReintento<T>(
    base: string,
    nombre: string,
    fn: (
      tx: Prisma.TransactionClient,
      tenant: { id: string; codigo: string; nombre: string },
    ) => Promise<T>,
  ): Promise<T> {
    const MAX_INTENTOS = 6;
    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      const codigo = await this.elegirCodigoLibre(base);
      try {
        return await this.prisma.$transaction(async (tx) => {
          const tenant = await tx.tenant.create({
            data: { codigo, nombre },
            select: { id: true, codigo: true, nombre: true },
          });
          return fn(tx, tenant);
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          intento < MAX_INTENTOS - 1
        ) {
          continue; // code taken between check and insert; try the next one
        }
        throw e;
      }
    }
    throw new ConflictException(
      'No se pudo generar un código de empresa único',
    );
  }

  /** Picks the first free code of the form base, base-2, base-3, ... */
  private async elegirCodigoLibre(base: string): Promise<string> {
    const existentes = await this.prisma.tenant.findMany({
      where: { codigo: { startsWith: base } },
      select: { codigo: true },
    });
    const usados = new Set(existentes.map((t) => t.codigo));
    if (!usados.has(base)) {
      return base;
    }
    let sufijo = 2;
    while (usados.has(`${base}-${sufijo}`)) {
      sufijo++;
    }
    return `${base}-${sufijo}`;
  }
}
