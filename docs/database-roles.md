# PostgreSQL runtime roles

The API uses two non-superuser roles so PostgreSQL RLS enforces tenant isolation:

```sql
-- Run in core-pos as the database owner after applying migrations.
ALTER ROLE pos_app WITH LOGIN PASSWORD '<core-app-password>' NOSUPERUSER NOBYPASSRLS;

-- Run in management-pos as the database owner after applying migrations.
ALTER ROLE pos_management_app WITH LOGIN PASSWORD '<management-app-password>' NOSUPERUSER NOBYPASSRLS;
```

`CORE_DATABASE_URL` must use `pos_app` and `MANAGEMENT_DATABASE_URL` must use
`pos_management_app`.

## Outbox relay role

The tenant relay claims `OutboxEvent` rows for every tenant, so it needs a
separate Core-only worker role. It must not be used by HTTP handlers.

```sql
-- Run in core-pos as the database owner.
CREATE ROLE pos_outbox_worker LOGIN PASSWORD '<worker-password>' NOSUPERUSER BYPASSRLS;
GRANT USAGE ON SCHEMA public TO pos_outbox_worker;
GRANT SELECT, UPDATE ON TABLE "OutboxEvent" TO pos_outbox_worker;
```

Set `CORE_OUTBOX_DATABASE_URL` to that role's `core-pos` connection string.
The relay stays disabled until this variable is set.
