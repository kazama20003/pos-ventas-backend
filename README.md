# POS Backend

Nest 11 foundation for multi-tenant POS SaaS. Two PostgreSQL logical databases enforce SaaS-management and tenant-operational boundaries.

## Setup

Copy `.env.example` to `.env.local` and replace placeholders with local credentials. `ENV` selects `.env.local`, `.env.production`, or `.env.test`; unsupported values fail at startup and Prisma config load.

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm build
pnpm test
pnpm test:e2e
```

## Carga

La prueba de carga para una instancia de 8 GB está en
[`docs/prueba-carga-8gb.md`](docs/prueba-carga-8gb.md). Ejecuta `pnpm load:8gb`
desde una máquina distinta al servidor medido.

Prisma commands:

```bash
pnpm prisma:operaciones:migrate -- --name init_operaciones
pnpm prisma:administracion:migrate -- --name init_administracion
```

`CORE_DATABASE_URL` and `MANAGEMENT_DATABASE_URL` must target different databases. Do not use `DATABASE_URL`, share a database transaction, or commit environment credentials.

## Boundaries

`prisma/operaciones/schema.prisma` owns tenant operational data: tenants, organizations, branches, warehouses, terminals, membership and roles, catalog and prices, inventory ledger and balances, cash sessions, sales snapshots/payments, electronic documents, audit log, and transactional outbox.

`prisma/administracion/schema.prisma` owns SaaS administration: plans, features, subscriptions, entitlements, usage metering, tenant administration, integrations, and management audit log.

The operations schema also covers RBAC, advanced catalog and pricing, inventory ledger, lots and serials, quotations and orders, sales and refunds, cash management, provider payments, SUNAT documents, purchases, receivables, payables, files, notifications, webhooks, audit, and outbox events. The administration schema covers versioned plans, billing, usage, onboarding, domains, API clients, support access, and reliable inbox/outbox delivery.

Management records use `tenantId` as an opaque UUID. No Prisma relation or foreign key crosses databases. Operational code belongs below `src/modulos/nucleo`; SaaS administration belongs below `src/modulos/administracion`. `src/compartido/base-datos` exposes separate `CorePrismaService` and `ManagementPrismaService`, each using Prisma 7 `@prisma/adapter-pg`.

Project-owned paths use Spanish. Technical identifiers, including Nest module/service class names and Prisma model names, remain English to preserve their public APIs.

## Transaction And Event Rules

Use a transaction only inside one database and one aggregate workflow. A core change that must notify management writes its `OutboxEvent` in same core transaction. Outbox worker publishes event with idempotency key; management consumes it idempotently in its own transaction. Never coordinate both clients with distributed transactions or cross-database foreign keys.

`tenant.created` events are relayed by `RelayTenantOutbox` into the management inbox. The HTTP runtime URLs must use the RLS-constrained `pos_app` and `pos_management_app` roles. Set `CORE_OUTBOX_DATABASE_URL` to the separate, Core-only worker role that can claim `OutboxEvent` rows across tenants; see `docs/database-roles.md`.

Production migrations must add PostgreSQL RLS policies, financial and quantity `CHECK` constraints, effective-date exclusion constraints, and immutability rules for posted ledger and fiscal records. Prisma models provide tenant-aware keys and relations; application services must still set tenant context and update ledger projections atomically.

`GET /health` is dependency-free startup health only; it does not query either database.
