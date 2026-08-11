import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';

export interface DefinicionPermiso {
  clave: string;
  resource: string;
  action: string;
  descripcion: string;
}

/**
 * Canonical permission catalog. Permissions are a global (non-tenant) reference
 * table; roles per tenant grant subsets of these keys. Kept in code and
 * upserted on boot so the set of protectable actions is versioned with the app.
 */
export const CATALOGO_PERMISOS: DefinicionPermiso[] = [
  {
    clave: 'usuarios.crear',
    resource: 'usuarios',
    action: 'crear',
    descripcion: 'Invitar/crear usuarios',
  },
  {
    clave: 'usuarios.listar',
    resource: 'usuarios',
    action: 'listar',
    descripcion: 'Listar usuarios',
  },
  {
    clave: 'usuarios.actualizar',
    resource: 'usuarios',
    action: 'actualizar',
    descripcion: 'Actualizar usuarios',
  },
  {
    clave: 'usuarios.desactivar',
    resource: 'usuarios',
    action: 'desactivar',
    descripcion: 'Desactivar usuarios',
  },
  {
    clave: 'roles.crear',
    resource: 'roles',
    action: 'crear',
    descripcion: 'Crear roles',
  },
  {
    clave: 'roles.listar',
    resource: 'roles',
    action: 'listar',
    descripcion: 'Listar roles',
  },
  {
    clave: 'roles.asignar',
    resource: 'roles',
    action: 'asignar',
    descripcion: 'Asignar permisos a roles',
  },
  {
    clave: 'ventas.crear',
    resource: 'ventas',
    action: 'crear',
    descripcion: 'Registrar ventas',
  },
  {
    clave: 'ventas.devolver',
    resource: 'ventas',
    action: 'devolver',
    descripcion: 'Registrar devoluciones de venta',
  },
  {
    clave: 'catalogo.crear',
    resource: 'catalogo',
    action: 'crear',
    descripcion: 'Gestionar catálogo y precios',
  },
  {
    clave: 'catalogo.listar',
    resource: 'catalogo',
    action: 'listar',
    descripcion: 'Consultar catálogo y precios',
  },
  {
    clave: 'catalogo.editar',
    resource: 'catalogo',
    action: 'editar',
    descripcion: 'Editar productos y catálogo',
  },
  {
    clave: 'catalogo.eliminar',
    resource: 'catalogo',
    action: 'eliminar',
    descripcion: 'Archivar productos del catálogo',
  },
  {
    clave: 'inventario.stock_inicial',
    resource: 'inventario',
    action: 'stock_inicial',
    descripcion: 'Registrar apertura de inventario',
  },
  {
    clave: 'archivos.subir',
    resource: 'archivos',
    action: 'subir',
    descripcion: 'Subir imágenes y archivos',
  },
  {
    clave: 'inventario.ajustar',
    resource: 'inventario',
    action: 'ajustar',
    descripcion: 'Ajustar stock (entradas, salidas, mermas)',
  },
  {
    clave: 'inventario.listar',
    resource: 'inventario',
    action: 'listar',
    descripcion: 'Consultar stock y kardex',
  },
  {
    clave: 'inventario.transferir',
    resource: 'inventario',
    action: 'transferir',
    descripcion: 'Crear y recibir transferencias entre almacenes',
  },
  {
    clave: 'caja.abrir',
    resource: 'caja',
    action: 'abrir',
    descripcion: 'Abrir sesión de caja',
  },
  {
    clave: 'caja.cerrar',
    resource: 'caja',
    action: 'cerrar',
    descripcion: 'Cerrar y conciliar sesión de caja',
  },
  {
    clave: 'facturacion.emitir',
    resource: 'facturacion',
    action: 'emitir',
    descripcion: 'Emitir comprobantes electrónicos y notas de crédito',
  },
  {
    clave: 'facturacion.leer',
    resource: 'facturacion',
    action: 'leer',
    descripcion: 'Consultar comprobantes electrónicos',
  },
  {
    clave: 'clientes.crear',
    resource: 'clientes',
    action: 'crear',
    descripcion: 'Registrar clientes',
  },
  {
    clave: 'clientes.listar',
    resource: 'clientes',
    action: 'listar',
    descripcion: 'Consultar clientes y cuentas por cobrar',
  },
  {
    clave: 'clientes.actualizar',
    resource: 'clientes',
    action: 'actualizar',
    descripcion: 'Actualizar clientes y líneas de crédito',
  },
  {
    clave: 'cobros.registrar',
    resource: 'cobros',
    action: 'registrar',
    descripcion: 'Registrar cobros de cuentas por cobrar',
  },
  {
    clave: 'proveedores.crear',
    resource: 'proveedores',
    action: 'crear',
    descripcion: 'Registrar proveedores',
  },
  {
    clave: 'proveedores.listar',
    resource: 'proveedores',
    action: 'listar',
    descripcion: 'Consultar proveedores',
  },
  {
    clave: 'proveedores.actualizar',
    resource: 'proveedores',
    action: 'actualizar',
    descripcion: 'Actualizar proveedores',
  },
  {
    clave: 'compras.crear',
    resource: 'compras',
    action: 'crear',
    descripcion: 'Crear órdenes de compra',
  },
  {
    clave: 'compras.listar',
    resource: 'compras',
    action: 'listar',
    descripcion: 'Consultar órdenes de compra',
  },
  {
    clave: 'compras.recepcionar',
    resource: 'compras',
    action: 'recepcionar',
    descripcion: 'Contabilizar recepciones de compra',
  },
  {
    clave: 'compras.pagar',
    resource: 'compras',
    action: 'pagar',
    descripcion: 'Registrar pagos a proveedores',
  },
  {
    clave: 'reportes.leer',
    resource: 'reportes',
    action: 'leer',
    descripcion: 'Consultar reportes y analítica',
  },
  {
    clave: 'plataforma.gestionar',
    resource: 'plataforma',
    action: 'gestionar',
    descripcion:
      'Gestionar catálogo SaaS: planes, características, precios y medidores (solo operador)',
  },
  {
    clave: 'suscripcion.leer',
    resource: 'suscripcion',
    action: 'leer',
    descripcion: 'Consultar la suscripción, uso y facturas del tenant',
  },
  {
    clave: 'suscripcion.gestionar',
    resource: 'suscripcion',
    action: 'gestionar',
    descripcion:
      'Suscribir, cambiar plan, cancelar y pagar facturas del tenant',
  },
  {
    clave: 'uso.registrar',
    resource: 'uso',
    action: 'registrar',
    descripcion: 'Registrar eventos de uso medido',
  },
  {
    clave: 'pagos.configurar',
    resource: 'pagos',
    action: 'configurar',
    descripcion: 'Registrar cuentas de pasarela de pago',
  },
  {
    clave: 'pagos.cobrar',
    resource: 'pagos',
    action: 'cobrar',
    descripcion: 'Crear intentos y cobrar con billetera/tarjeta',
  },
  {
    clave: 'pagos.leer',
    resource: 'pagos',
    action: 'leer',
    descripcion: 'Consultar intentos y transacciones de pago',
  },
  {
    clave: 'empresas.gestionar',
    resource: 'empresas',
    action: 'gestionar',
    descripcion: 'Crear y actualizar empresas',
  },
  {
    clave: 'empresas.leer',
    resource: 'empresas',
    action: 'leer',
    descripcion: 'Consultar empresas',
  },
  {
    clave: 'sucursales.gestionar',
    resource: 'sucursales',
    action: 'gestionar',
    descripcion: 'Crear sucursales, almacenes y cajas',
  },
  {
    clave: 'sucursales.leer',
    resource: 'sucursales',
    action: 'leer',
    descripcion: 'Consultar sucursales, almacenes y cajas',
  },
  {
    clave: 'notificaciones.gestionar',
    resource: 'notificaciones',
    action: 'gestionar',
    descripcion: 'Emitir notificaciones a usuarios',
  },
  {
    clave: 'notificaciones.leer',
    resource: 'notificaciones',
    action: 'leer',
    descripcion: 'Consultar la bandeja de notificaciones',
  },
  {
    clave: 'restaurante.gestionar',
    resource: 'restaurante',
    action: 'gestionar',
    descripcion: 'Gestionar mesas y zonas del salón',
  },
  {
    clave: 'restaurante.operar',
    resource: 'restaurante',
    action: 'operar',
    descripcion: 'Abrir comandas, agregar ítems y enviar a cocina',
  },
  {
    clave: 'restaurante.cobrar',
    resource: 'restaurante',
    action: 'cobrar',
    descripcion: 'Cobrar comandas (cuenta) y cerrar mesas',
  },
  {
    clave: 'restaurante.cocina',
    resource: 'restaurante',
    action: 'cocina',
    descripcion: 'Operar el KDS y actualizar el estado de cocina de los ítems',
  },
  {
    clave: 'restaurante.leer',
    resource: 'restaurante',
    action: 'leer',
    descripcion: 'Consultar mesas, mapa y comandas',
  },
  {
    clave: 'webhooks.gestionar',
    resource: 'webhooks',
    action: 'gestionar',
    descripcion: 'Registrar endpoints y emitir webhooks salientes',
  },
];

export const CLAVES_PERMISOS_VALIDAS = new Set(
  CATALOGO_PERMISOS.map((p) => p.clave),
);

@Injectable()
export class CatalogoPermisosService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogoPermisosService.name);

  constructor(private readonly prisma: CorePrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const permiso of CATALOGO_PERMISOS) {
      await this.prisma.permission.upsert({
        where: { clave: permiso.clave },
        update: {
          resource: permiso.resource,
          action: permiso.action,
          descripcion: permiso.descripcion,
        },
        create: permiso,
      });
    }
    this.logger.log(
      `Catálogo de permisos sincronizado (${CATALOGO_PERMISOS.length})`,
    );
  }
}
