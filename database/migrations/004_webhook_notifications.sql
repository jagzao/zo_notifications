-- Migración para añadir webhooks de notificación a API keys

-- Añadir columna webhook_url a api_keys
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Índice para búsquedas de webhooks activos
CREATE INDEX IF NOT EXISTS idx_api_keys_webhook
  ON api_keys(webhook_url)
  WHERE webhook_url IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN api_keys.webhook_url IS 'URL del webhook para notificaciones de rate limiting';

-- Ejemplo de cómo configurar webhook para un API key
UPDATE api_keys
SET webhook_url = 'https://your-app.com/webhooks/rate-limit'
WHERE key = 'your-api-key'
  AND webhook_url IS NULL;

-- Función para validar formato de webhook URL
CREATE OR REPLACE FUNCTION validate_webhook_url()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.webhook_url IS NOT NULL AND NEW.webhook_url !~ '^https?://.+' THEN
    RAISE EXCEPTION 'webhook_url must be a valid HTTP/HTTPS URL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar webhook URL antes de INSERT/UPDATE
DROP TRIGGER IF EXISTS validate_webhook_url_trigger ON api_keys;
CREATE TRIGGER validate_webhook_url_trigger
  BEFORE INSERT OR UPDATE ON api_keys
  FOR EACH ROW
  WHEN (NEW.webhook_url IS NOT NULL)
  EXECUTE FUNCTION validate_webhook_url();
