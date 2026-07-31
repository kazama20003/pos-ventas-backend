# Estado del proyecto POS — qué sigue y qué falta ajustar

Actualizado: 2026-07-31

## ✅ Hecho (backend) — Roadmap multi-local #1–#13 COMPLETO
1. Transferencias entre almacenes (envío/recepción parcial/cancelar, costo promedio ponderado).
2. Stock consolidado por almacén/sucursal + valorizado (`GET /inventario/stock`).
3. Cajas/terminales por sucursal (CRUD).
4. Editar/archivar sucursales, almacenes y cajas.
5. Datos completos de sucursal (dirección, teléfono, ubigeo SUNAT).
6. Tipos de almacén (principal/tránsito/merma/devoluciones).
7. Almacén predeterminado por sucursal **+ cableado en ventas** (la venta descuenta del predeterminado).
8. Stock mínimo + alertas de reabastecimiento (`GET /inventario/alertas`, `POST /inventario/nivel`).
9. Conteos físicos (`/inventario/conteos*`, ledger GANANCIA/PERDIDA_CONTEO).
10. Reservas de stock (`/inventario/reservas*`, aparta available→reserved).
11. **Permisos por sucursal**: `AutorizacionSucursalService` + enforcement en `caja.abrir` y `ventas.crear`;
    roles con `sucursalId`; `GET /usuarios/mis-sucursales`.
12. Reportes por sucursal (todo calculado en backend: `/reportes/por-sucursal`, `/ventas-por-sucursal`).
13. Crear empresas desde UI (backend ya existía; `GET /usuarios/organizaciones`).

Migraciones aplicadas: `20260731020000_almacen_tipo`, `..030000_almacen_predeterminado`, `..040000_stock_minimo`.

## 🔜 Qué sigue (front tiene backend listo, falta la vista)
Las siguientes pantallas del frontend son **stubs vacíos** pero su backend ya está completo y probado:
- **Ventas (POS)** 🔥 — `ventas.service.crear` (idempotente, exige caja para efectivo, descuenta del almacén
  predeterminado, permisos por sucursal). Falta la UI de punto de venta.
- **Caja** 🔥 — `caja.service` abrir/cerrar/arqueo. Va junto con POS (vender exige turno abierto).
- **Clientes** + cuentas por cobrar — `CustomersModule`.
- **Compras** (órdenes/recepciones/pagos) + **Proveedores** + CxP — `PurchasesModule`, `SuppliersModule`.
- **Facturación** SUNAT — `FiscalModule`.
- **Suscripción** SaaS — `suscripciones`.

## ⚠️ Qué falta ajustar (deuda técnica conocida)
- **Verificación end-to-end real**: varias pantallas están tras login Google; solo verificadas con tsc+eslint.
  Falta levantar server+BD con datos y probar el flujo completo (invitar usuario → login → vender → arquear).
- **Lint preexistente** (no del roadmap): `src/modulos/nucleo/identidad/verificador-google.ts` usa `any` del
  payload de Google (11 errores `no-unsafe-*`). Tipar el payload.
- **Reservas**: no hay job que expire reservas vencidas (`venceEn`); hoy solo manual. Falta cron/endpoint de barrido.
- **Almacén archivado predeterminado**: al archivar el almacén predeterminado no se reasigna otro; queda sin default.
- Correlativos `TR-`/`CONT-` por conteo simple (count+1); revisar concurrencia alta (unique constraint protege).
