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

  /**
   * Flujos de onboarding contextual. Cada flujo agrupa pasos cuya completitud
   * se DERIVA de datos reales del tenant (eventos de negocio: empresa creada,
   * primera venta, primer comprobante, etc.), mezclada con overrides
   * persistidos por usuario (OMITIDO/DESCARTADO en OnboardingProgress).
   * Extensible: para añadir un flujo/paso, agrega la entrada en `definiciones`
   * y su verificación en `hechos`.
   */
  async flujos(inquilinoId: string, userId?: string) {
    return this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      const [
        empresas,
        sucursales,
        cajas,
        productos,
        productosFisicos,
        conStock,
        mesas,
        sesionesCaja,
        ventas,
        comprobantes,
      ] = await Promise.all([
        tx.company.count({ where: { inquilinoId } }),
        tx.branch.count({ where: { inquilinoId } }),
        tx.cashRegister.count({ where: { inquilinoId } }),
        tx.product.count({ where: { inquilinoId, estado: 'ACTIVO' } }),
        tx.product.count({
          where: { inquilinoId, estado: 'ACTIVO', kind: { not: 'SERVICIO' } },
        }),
        tx.stockBalance.count({ where: { inquilinoId, enStock: { gt: 0 } } }),
        tx.restaurantTable.count({
          where: { inquilinoId, estadoRegistro: 'ACTIVO' },
        }),
        tx.cashSession.count({ where: { inquilinoId } }),
        tx.sale.count({ where: { inquilinoId } }),
        tx.electronicDocument.count({ where: { inquilinoId } }),
      ]);

      // Eventos reales del sistema → hechos derivados.
      const hechos: Record<string, boolean> = {
        empresa_creada: empresas > 0,
        sucursal_creada: sucursales > 0,
        caja_creada: cajas > 0,
        producto_creado: productos > 0,
        producto_fisico_creado: productosFisicos > 0,
        stock_cargado: conStock > 0,
        mesas_creadas: mesas > 0,
        caja_abierta: sesionesCaja > 0,
        primera_venta_creada: ventas > 0,
        primer_comprobante_emitido: comprobantes > 0,
      };

      // El recorrido se adapta al tipo de negocio real del tenant:
      // - Solo servicios → sin paso de stock/compras.
      // - Vende producto físico → paso "stock" (proveedor + compra) antes de
      //   abrir caja.
      // - Tiene mesas (restaurante) → la venta se guía por el salón.
      const vendeFisico = productosFisicos > 0;
      const esRestaurante = mesas > 0;

      const definiciones = [
        {
          flowKey: 'puesta-en-marcha',
          titulo: 'Pon tu negocio en marcha',
          pasos: [
            { stepKey: 'empresa', evento: 'empresa_creada', vista: '/configuracion' },
            { stepKey: 'sucursal', evento: 'sucursal_creada', vista: '/sucursales' },
            { stepKey: 'caja', evento: 'caja_creada', vista: '/sucursales' },
            { stepKey: 'producto', evento: 'producto_creado', vista: '/productos/nuevo' },
          ],
        },
        {
          flowKey: 'primera-venta',
          titulo: 'Haz tu primera venta',
          pasos: [
            ...(vendeFisico
              ? [
                  {
                    stepKey: 'stock',
                    evento: 'stock_cargado',
                    vista: '/compras',
                  },
                ]
              : []),
            { stepKey: 'abrir-caja', evento: 'caja_abierta', vista: '/caja' },
            {
              stepKey: 'vender',
              evento: 'primera_venta_creada',
              vista: esRestaurante ? '/restaurante' : '/ventas',
            },
            { stepKey: 'comprobante', evento: 'primer_comprobante_emitido', vista: '/facturacion' },
          ],
        },
      ];

      // Overrides persistidos (del usuario o a nivel tenant cuando userId null).
      const overrides = await tx.onboardingProgress.findMany({
        where: {
          inquilinoId,
          OR: [{ userId: userId ?? null }, { userId: null }],
        },
      });
      const buscarOverride = (flowKey: string, stepKey: string) =>
        overrides.find(
          (o) =>
            o.flowKey === flowKey &&
            o.stepKey === stepKey &&
            (o.userId === (userId ?? null) || o.userId === null),
        );

      const flujosResueltos = definiciones.map((f) => {
        const flujoOverride = buscarOverride(f.flowKey, '_flow');
        const pasos = f.pasos.map((p) => {
          const derivado = hechos[p.evento] === true;
          const override = buscarOverride(f.flowKey, p.stepKey);
          const status = derivado
            ? 'COMPLETADO'
            : (override?.status ?? 'PENDIENTE');
          return { ...p, status, derivado };
        });
        const completados = pasos.filter(
          (p) => p.status === 'COMPLETADO' || p.status === 'OMITIDO',
        ).length;
        const pasoActivo =
          pasos.find((p) => p.status === 'PENDIENTE')?.stepKey ?? null;
        return {
          flowKey: f.flowKey,
          titulo: f.titulo,
          descartado: flujoOverride?.status === 'DESCARTADO',
          completado: completados === pasos.length,
          pasoActivo,
          pasos,
        };
      });

      return { hechos, flujos: flujosResueltos };
    });
  }

  /**
   * Override manual de un paso o flujo ('_flow' como stepKey descarta el flujo
   * completo): OMITIDO, DESCARTADO o de vuelta a PENDIENTE. Upsert idempotente
   * por tenant+usuario+flujo+paso.
   */
  async actualizarPaso(
    inquilinoId: string,
    userId: string | null,
    flowKey: string,
    stepKey: string,
    status: 'PENDIENTE' | 'OMITIDO' | 'DESCARTADO',
  ) {
    await this.prisma.ejecutarEnTenant(inquilinoId, async (tx) => {
      // findFirst+update en vez de upsert: con userId null el unique de
      // Postgres trata los NULL como distintos y el upsert duplicaría filas.
      const existente = await tx.onboardingProgress.findFirst({
        where: { inquilinoId, userId, flowKey, stepKey },
        select: { id: true },
      });
      const data = {
        status,
        descartadoEn: status === 'DESCARTADO' ? new Date() : null,
      };
      if (existente) {
        await tx.onboardingProgress.update({
          where: { id: existente.id },
          data,
        });
      } else {
        await tx.onboardingProgress.create({
          data: { inquilinoId, userId, flowKey, stepKey, ...data },
        });
      }
    });
    return this.flujos(inquilinoId, userId ?? undefined);
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
