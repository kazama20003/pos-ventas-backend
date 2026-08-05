import { ConflictException } from '@nestjs/common';
import { VentasService } from './ventas.service';

/**
 * Pruebas de la resolución de almacén de la venta (sin DB). Se ejercitan los
 * métodos privados `resolverAlmacen` y `exigirAlmacenesDeSucursal` con un `tx`
 * falso que devuelve exactamente lo que cada caso necesita.
 */
type Tx = Record<string, unknown>;

const SUC = 'suc-1';
const INQ = 'inq-1';

function crearServicio(): VentasService {
  // Los helpers bajo prueba solo tocan `tx`; las dependencias no se usan.
  return new VentasService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

function invocar<T>(nombre: string, ...args: unknown[]): Promise<T> {
  const svc = crearServicio() as unknown as Record<
    string,
    (...a: unknown[]) => Promise<T>
  >;
  return svc[nombre](...args);
}

describe('VentasService · resolverAlmacen', () => {
  it('prioriza el almacén de la caja de la sesión (activo y de la sucursal)', async () => {
    const tx = {
      cashSession: {
        findFirst: jest.fn().mockResolvedValue({
          cashRegister: {
            almacen: { id: 'alm-caja', sucursalId: SUC, estado: 'ACTIVO' },
          },
        }),
      },
      warehouse: { findFirst: jest.fn(), findMany: jest.fn() },
    } as Tx;
    const r = await invocar<string | null>(
      'resolverAlmacen',
      tx,
      INQ,
      SUC,
      'ses-1',
    );
    expect(r).toBe('alm-caja');
    expect((tx as any).warehouse.findFirst).not.toHaveBeenCalled();
  });

  it('ignora el almacén de la caja si es de otra sucursal y cae al default', async () => {
    const tx = {
      cashSession: {
        findFirst: jest.fn().mockResolvedValue({
          cashRegister: {
            almacen: { id: 'alm-otra', sucursalId: 'suc-2', estado: 'ACTIVO' },
          },
        }),
      },
      warehouse: {
        findFirst: jest.fn().mockResolvedValue({ id: 'alm-default' }),
        findMany: jest.fn(),
      },
    } as Tx;
    const r = await invocar<string | null>(
      'resolverAlmacen',
      tx,
      INQ,
      SUC,
      'ses-1',
    );
    expect(r).toBe('alm-default');
  });

  it('sin caja usa el predeterminado de la sucursal', async () => {
    const tx = {
      warehouse: {
        findFirst: jest.fn().mockResolvedValue({ id: 'alm-default' }),
        findMany: jest.fn(),
      },
    } as Tx;
    const r = await invocar<string | null>('resolverAlmacen', tx, INQ, SUC);
    expect(r).toBe('alm-default');
  });

  it('sin default pero con un único almacén activo, lo usa', async () => {
    const tx = {
      warehouse: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ id: 'alm-unico' }]),
      },
    } as Tx;
    const r = await invocar<string | null>('resolverAlmacen', tx, INQ, SUC);
    expect(r).toBe('alm-unico');
  });

  it('sin default y con varios almacenes, no resuelve (null)', async () => {
    const tx = {
      warehouse: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'a' }, { id: 'b' }]),
      },
    } as Tx;
    const r = await invocar<string | null>('resolverAlmacen', tx, INQ, SUC);
    expect(r).toBeNull();
  });
});

describe('VentasService · exigirAlmacenesDeSucursal', () => {
  it('no consulta nada si no hay almacenes explícitos', async () => {
    const tx = { warehouse: { findMany: jest.fn() } } as Tx;
    await invocar('exigirAlmacenesDeSucursal', tx, INQ, SUC, [
      undefined,
      undefined,
    ]);
    expect((tx as any).warehouse.findMany).not.toHaveBeenCalled();
  });

  it('acepta almacenes que pertenecen a la sucursal y están activos', async () => {
    const tx = {
      warehouse: {
        findMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]),
      },
    } as Tx;
    await expect(
      invocar('exigirAlmacenesDeSucursal', tx, INQ, SUC, ['a', 'b', undefined]),
    ).resolves.toBeUndefined();
  });

  it('rechaza un almacén que no pertenece a la sucursal o está archivado', async () => {
    const tx = {
      warehouse: {
        findMany: jest.fn().mockResolvedValue([{ id: 'a' }]),
      },
    } as Tx;
    await expect(
      invocar('exigirAlmacenesDeSucursal', tx, INQ, SUC, ['a', 'intruso']),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
