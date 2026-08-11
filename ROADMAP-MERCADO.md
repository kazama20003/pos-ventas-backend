# Roadmap de mercado — Brechas para dominar

Análisis de qué falta para que el POS "se coma el mercado" (Perú, retail/restaurante).
Base: backend maduro (multi-tenant, RBAC, inventario con kardex/lotes/series, ventas
idempotentes con sync offline, caja, compras, CxC/CxP, promociones, SUNAT/Nubefact,
pagos/Culqi, SaaS con planes/suscripciones/gating).

---

## 1. Riesgo técnico que mata ventas (crítico — tapar YA)

- **RLS no verificado activo** → fuga de datos entre tenants = fin del SaaS.
  Verificar que el runtime conecta como rol `pos_app` (no superusuario). Ver `rls-activacion-pos-app`.
- **Cobertura de tests casi nula** en flujo dinero (ventas/caja/fiscal).
  Un bug de cálculo = pérdida de confianza.
- **Sin verificación e2e real** (server + BD) — reconocido en `SIGUIENTE.md`.
- **Correlativos con contención** en alta concurrencia → riesgo en hora pico.
- **Falta cron de expiración de reservas** → stock fantasma.

## 2. Features de producto que el mercado exige (para vender más)

- **Restaurante / gastronomía**: mesas, comandas, cocina (KDS), división de cuenta,
  propinas. Mercado enorme en Perú, hoy no cubierto.
- **App móvil / PWA offline-first**: el backend ya tiene sync offline; falta el canal.
  Vendedor con celular = diferenciador.
- **Balanza / código peso, lector barcode**: barcodes ya modelados, falta el flujo.
- **Reportes / BI**: dashboard existe, faltan analítica avanzada, exportación, alertas.
- **Fidelización / puntos, gift cards**: no existe modelo.
- **Facturación masiva / resumen diario de boletas SUNAT** (obligatorio) — verificar.
- **Marketplace / integraciones**: Rappi, PedidosYa, Shopify, WhatsApp.
  El módulo `integraciones` (núcleo) está vacío.

## 3. Go-to-market (para escalar)

- **Frontend detrás del backend**: backend listo pero sin UI no se vende. Cuello de botella #1.
- **Onboarding self-service** completo + demo/data seed.
- **Más pasarelas locales**: Yape/Plin, Izipay, Niubiz, Mercado Pago (hoy solo Culqi).
- **Más proveedores SUNAT**: hoy solo Nubefact — no depender de uno.

---

## Prioridad recomendada

1. **Blindar seguridad**: verificar RLS activo + tests del flujo dinero. (sin esto no se escala)
2. **Frontend POS usable** (backend ya listo).
3. **Módulo restaurante** = abre segmento gigante.
4. **Yape/Plin + PWA offline** = diferenciador Perú.
