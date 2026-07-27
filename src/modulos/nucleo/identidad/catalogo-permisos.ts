import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';

interface DefinicionPermiso {
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
  { clave: 'usuarios.crear', resource: 'usuarios', action: 'crear', descripcion: 'Invitar/crear usuarios' },
  { clave: 'usuarios.listar', resource: 'usuarios', action: 'listar', descripcion: 'Listar usuarios' },
  { clave: 'usuarios.actualizar', resource: 'usuarios', action: 'actualizar', descripcion: 'Actualizar usuarios' },
  { clave: 'usuarios.desactivar', resource: 'usuarios', action: 'desactivar', descripcion: 'Desactivar usuarios' },
  { clave: 'roles.crear', resource: 'roles', action: 'crear', descripcion: 'Crear roles' },
  { clave: 'roles.listar', resource: 'roles', action: 'listar', descripcion: 'Listar roles' },
  { clave: 'roles.asignar', resource: 'roles', action: 'asignar', descripcion: 'Asignar permisos a roles' },
  { clave: 'ventas.crear', resource: 'ventas', action: 'crear', descripcion: 'Registrar ventas' },
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
    this.logger.log(`Catálogo de permisos sincronizado (${CATALOGO_PERMISOS.length})`);
  }
}
