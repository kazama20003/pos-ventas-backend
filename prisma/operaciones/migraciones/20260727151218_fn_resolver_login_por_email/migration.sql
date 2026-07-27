-- Login routing under RLS.
-- Resolving "which tenants does this email belong to" is inherently a
-- cross-tenant read, which RLS forbids for the runtime role. This SECURITY
-- DEFINER function runs as its owner (the migration/superuser role), so it can
-- read across tenants, but it returns ONLY the ids needed to route login and
-- nothing else. It is the single sanctioned cross-tenant path.
CREATE OR REPLACE FUNCTION resolver_login_por_email(p_email text)
RETURNS TABLE(inquilino_id uuid, identidad_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ui."inquilinoId", ui."id"
  FROM "UserIdentity" ui
  WHERE lower(ui."email") = lower(p_email)
    AND ui."estado" = 'ACTIVO';
$$;

-- Only the application role may call it; revoke the public default.
REVOKE ALL ON FUNCTION resolver_login_por_email(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pos_app') THEN
    GRANT EXECUTE ON FUNCTION resolver_login_por_email(text) TO pos_app;
  END IF;
END
$$;
