import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { VerificadorGoogle } from '../src/modulos/nucleo/identidad/verificador-google';

/**
 * E2E del flujo completo de un usuario nuevo contra la BD local:
 * registro RAPIDA → onboarding contextual → producto → abrir caja → serie →
 * primera venta → flujos completos. Google se stubbea (no se puede acuñar un
 * idToken real en CI); todo lo demás (HTTP, validación, RLS, BD) es real.
 */
describe('Flujo usuario nuevo (e2e)', () => {
  let app: INestApplication<App>;
  const correo = `e2e-${Date.now()}@prueba.local`;

  let accessToken: string;
  let empresaId: string;
  let sucursalId: string;
  let cajaId: string;
  let varianteId: string;
  let serieId: string;
  let sesionCajaId: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(VerificadorGoogle)
      .useValue({
        verificar: async () => ({
          sub: `e2e-${Date.now()}`,
          email: correo,
          emailVerificado: true,
          nombre: 'Usuario E2E',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  it('1. registra la empresa (RAPIDA) y recibe tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/onboarding/registrar')
      .send({
        idToken: 'stub',
        tenantNombre: 'Bodega E2E',
        organizacionNombre: 'Bodega E2E',
        empresaRazonSocial: 'Bodega E2E S.A.C.',
        empresaRuc: '20123456789',
        configuracionInicial: 'RAPIDA',
      })
      .expect(201);

    expect(res.body.tokens.accessToken).toBeDefined();
    accessToken = res.body.tokens.accessToken;
  });

  it('2. la guía dice: siguiente paso = crear producto', async () => {
    const res = await request(app.getHttpServer())
      .get('/onboarding/estado')
      .set(auth())
      .expect(200);
    expect(res.body.pasoActual).toBe('producto');
    expect(res.body.descartado).toBe(false);
  });

  it('3. flujos contextuales: puesta-en-marcha va por "producto"', async () => {
    const res = await request(app.getHttpServer())
      .get('/onboarding/flujos')
      .set(auth())
      .expect(200);
    const puesta = res.body.flujos.find(
      (f: { flowKey: string }) => f.flowKey === 'puesta-en-marcha',
    );
    expect(res.body.hechos.empresa_creada).toBe(true);
    expect(res.body.hechos.sucursal_creada).toBe(true);
    expect(res.body.hechos.caja_creada).toBe(true);
    expect(puesta.pasoActivo).toBe('producto');
  });

  it('4. resuelve empresa, sucursal y caja creadas por RAPIDA', async () => {
    const empresas = await request(app.getHttpServer())
      .get('/empresas')
      .set(auth())
      .expect(200);
    empresaId = (empresas.body.items ?? empresas.body)[0].id;

    const sucursales = await request(app.getHttpServer())
      .get('/sucursales')
      .set(auth())
      .expect(200);
    sucursalId = (sucursales.body.items ?? sucursales.body)[0].id;

    const cajas = await request(app.getHttpServer())
      .get('/sucursales/cajas')
      .query({ sucursalId })
      .set(auth())
      .expect(200);
    cajaId = (cajas.body.items ?? cajas.body)[0].id;

    expect(empresaId).toBeDefined();
    expect(sucursalId).toBeDefined();
    expect(cajaId).toBeDefined();
  });

  it('5. crea unidad de medida y primer producto con stock y precio', async () => {
    const um = await request(app.getHttpServer())
      .post('/catalogo/unidades-medida')
      .set(auth())
      .send({ codigo: 'NIU', sunatCode: 'NIU', nombre: 'Unidad', symbol: 'u' })
      .expect(201);

    const prod = await request(app.getHttpServer())
      .post('/catalogo/productos')
      .set(auth())
      .send({
        nombre: 'Café molido 500g',
        variantes: [
          {
            unidadMedidaId: um.body.id,
            nombre: 'Café molido 500g',
            precio: 25,
            stockInicial: 100,
          },
        ],
      })
      .expect(201);

    varianteId = prod.body.variants?.[0]?.id ?? prod.body.variantes?.[0]?.id;
    expect(varianteId).toBeDefined();
  });

  it('6. flujos avanzan: producto hecho, ahora abrir caja', async () => {
    const res = await request(app.getHttpServer())
      .get('/onboarding/flujos')
      .set(auth())
      .expect(200);
    expect(res.body.hechos.producto_creado).toBe(true);
    const puesta = res.body.flujos.find(
      (f: { flowKey: string }) => f.flowKey === 'puesta-en-marcha',
    );
    expect(puesta.completado).toBe(true);
    const venta = res.body.flujos.find(
      (f: { flowKey: string }) => f.flowKey === 'primera-venta',
    );
    expect(venta.pasoActivo).toBe('abrir-caja');
  });

  it('7. abre la caja', async () => {
    const sesion = await request(app.getHttpServer())
      .post('/caja/sesiones')
      .set(auth())
      .send({ sucursalId, cajaId, montoApertura: 50 })
      .expect(201);
    sesionCajaId = sesion.body.id;
    expect(sesionCajaId).toBeDefined();

    const estado = await request(app.getHttpServer())
      .get('/onboarding/estado')
      .set(auth())
      .expect(200);
    expect(estado.body.pasoActual).toBe('venta');
  });

  it('8. crea serie y registra la primera venta', async () => {
    const serie = await request(app.getHttpServer())
      .post('/series')
      .set(auth())
      .send({ empresaId, documentType: 'BOLETA', series: 'B001' })
      .expect(201);
    serieId = serie.body.id;

    const venta = await request(app.getHttpServer())
      .post('/ventas')
      .set(auth())
      .send({
        empresaId,
        sucursalId,
        serieId,
        sesionCajaId,
        moneda: 'PEN',
        idempotencyKey: `e2e-venta-${Date.now()}`,
        items: [{ varianteId, cantidad: 2 }],
        pagos: [{ method: 'EFECTIVO', monto: 50 }],
      });
    if (venta.status !== 201) {
      // eslint-disable-next-line no-console
      console.log('VENTA ERROR', venta.status, JSON.stringify(venta.body));
    }
    expect(venta.status).toBe(201);
  });

  it('9. la guía queda completada y sella completadoEn', async () => {
    const estado = await request(app.getHttpServer())
      .get('/onboarding/estado')
      .set(auth())
      .expect(200);
    expect(estado.body.pasoActual).toBe('completado');
    expect(estado.body.completadoEn).not.toBeNull();

    const flujos = await request(app.getHttpServer())
      .get('/onboarding/flujos')
      .set(auth())
      .expect(200);
    expect(flujos.body.hechos.primera_venta_creada).toBe(true);
  });

  it('10. omite el paso de comprobante y el flujo primera-venta cierra', async () => {
    const res = await request(app.getHttpServer())
      .patch('/onboarding/flujos/primera-venta/pasos/comprobante')
      .set(auth())
      .send({ status: 'OMITIDO' })
      .expect(200);
    const venta = res.body.flujos.find(
      (f: { flowKey: string }) => f.flowKey === 'primera-venta',
    );
    expect(venta.completado).toBe(true);
  });
});
