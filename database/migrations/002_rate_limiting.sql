-- Migración para Rate Limiting por proyecto/API key
-- Añade tabla para tracking de rate limits

-- Tabla para tracking de rate limits
CREATE TABLE IF NOT EXISTS rate_limit_usage (
  id BIGSERIAL PRIMARY KEY,
  api_key VARCHAR(255) NOT NULL,
  project VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_api_key ON rate_limit_usage(api_key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_project ON rate_limit_usage(project);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_usage(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at ON rate_limit_usage(created_at DESC);

-- Índice compuesto para búsquedas rápidas de rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_unique_window 
  ON rate_limit_usage(api_key, endpoint, window_start);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_rate_limit_usage_updated_at
  BEFORE UPDATE ON rate_limit_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para limpiar registros antiguos de rate limiting (> 24h)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_usage
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Función para verificar rate limit (devuelve true si permitido, false si excedido)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key VARCHAR,
  p_endpoint VARCHAR,
  p_max_requests INT,
  p_window_ms INT
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INT,
  limit_max INT,
  reset_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_window_end TIMESTAMP WITH TIME ZONE;
  v_current_count INT;
BEGIN
  -- Calcular ventana de tiempo
  v_window_start := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;
  v_window_end := NOW();
  
  -- Contar requests en la ventana actual
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM rate_limit_usage
  WHERE api_key = p_api_key
    AND endpoint = p_endpoint
    AND window_start >= v_window_start
    AND window_end <= v_window_end;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    (v_current_count < p_max_requests) as allowed,
    v_current_count as current_count,
    p_max_requests as limit_max,
    v_window_end as reset_at;
END;
$$ LANGUAGE plpgsql;

-- Vista para monitorear rate limits por proyecto
CREATE OR REPLACE VIEW rate_limit_stats AS
SELECT
  api_key,
  project,
  endpoint,
  SUM(request_count) as total_requests,
  MIN(window_start) as period_start,
  MAX(window_end) as period_end,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM rate_limit_usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY api_key, project, endpoint
ORDER BY total_requests DESC;

-- Añadir tiers de rate limiting a la tabla api_keys
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'free' 
  CHECK (tier IN ('free', 'basic', 'pro', 'unlimited'));

-- Actualizar la tabla api_keys con limites por tier
UPDATE api_keys 
SET 
  rate_limit_max = CASE tier
    WHEN 'free' THEN 100
    WHEN 'basic' THEN 500
    WHEN 'pro' THEN 2000
    WHEN 'unlimited' THEN 999999
    ELSE 100
  END,
  rate_limit_window_ms = 60000 -- 1 minuto
WHERE tier IS NOT NULL;

-- Comentarios
COMMENT ON TABLE rate_limit_usage IS 'Tracking de uso de rate limits por API key y endpoint';
COMMENT ON COLUMN rate_limit_usage.window_start IS 'Inicio de la ventana de rate limiting';
COMMENT ON COLUMN rate_limit_usage.window_end IS 'Fin de la ventana de rate limiting';
COMMENT ON COLUMN api_keys.tier IS 'Tier del plan: free, basic, pro, unlimited';

-- Insertar algunos ejemplos de tiers
INSERT INTO api_keys (key, name, project, active, tier)
VALUES 
  ('free-tier-example-key', 'Free Tier Example', 'example-free', true, 'free'),
  ('pro-tier-example-key', 'Pro Tier Example', 'example-pro', true, 'pro')
ON CONFLICT (key) DO NOTHING;
