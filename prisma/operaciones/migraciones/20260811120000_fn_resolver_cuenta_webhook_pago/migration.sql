-- Webhook de pagos bajo RLS.
-- El webhook de la pasarela llega sin JWT ni contexto de tenant, pero necesita
-- resolver la cuenta del comercio (PaymentProviderAccount) para saber a qué
-- tenant pertenece el evento y con qué secreto verificar la firma. Esa lectura
-- es inherentemente cross-tenant y RLS la bloquea para el rol runtime. Igual
-- que resolver_login_por_email, esta función SECURITY DEFINER corre como su
-- owner y devuelve SOLO los campos mínimos para enrutar y verificar el webhook.
CREATE OR REPLACE FUNCTION resolver_cuenta_webhook_pago(
  p_proveedor text,
  p_referencia_comerciante text
)
RETURNS TABLE(
  id uuid,
  inquilino_id uuid,
  referencia_secreta_cifrada text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ppa."id", ppa."inquilinoId", ppa."referenciaSecretaCifrada"
  FROM "PaymentProviderAccount" ppa
  WHERE ppa."proveedor" = p_proveedor
    AND ppa."referenciaComerciante" = p_referencia_comerciante
  LIMIT 1;
$$;

-- Only the application role may call it; revoke the public default.
REVOKE ALL ON FUNCTION resolver_cuenta_webhook_pago(text, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pos_app') THEN
    GRANT EXECUTE ON FUNCTION resolver_cuenta_webhook_pago(text, text) TO pos_app;
  END IF;
END
$$;
