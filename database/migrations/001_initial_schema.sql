-- ZO Notifications Database Schema
-- Version: 1.0.0

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info')),
  project VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  data JSONB NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(project);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_api_key ON notifications(api_key);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Tabla de suscripciones de Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time BIGINT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);

-- Tabla de historial de envíos (para tracking)
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('webpush', 'discord')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'expired')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON notification_deliveries(created_at DESC);

-- Tabla de API keys (para gestión futura)
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  project VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  rate_limit_max INT DEFAULT 100,
  rate_limit_window_ms INT DEFAULT 60000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Índices para API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_deliveries_updated_at
  BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar API key de prueba (cambiar en producción)
INSERT INTO api_keys (key, name, project, active)
VALUES ('test-key-change-this-in-production', 'Test API Key', 'test-project', true)
ON CONFLICT (key) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE notifications IS 'Almacena todas las notificaciones recibidas';
COMMENT ON TABLE push_subscriptions IS 'Suscripciones de Web Push de los navegadores';
COMMENT ON TABLE notification_deliveries IS 'Historial de envíos de notificaciones';
COMMENT ON TABLE api_keys IS 'API Keys para autenticación de proyectos';

COMMENT ON COLUMN notifications.data IS 'Datos completos de la notificación en formato JSON';
COMMENT ON COLUMN notifications.read IS 'Indica si la notificación fue marcada como leída';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL del endpoint de push del navegador';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Clave pública del cliente para encriptación';
COMMENT ON COLUMN push_subscriptions.auth IS 'Secreto de autenticación del cliente';

-- Vista para estadísticas rápidas
CREATE OR REPLACE VIEW notification_stats_24h AS
SELECT
  type,
  COUNT(*) as count,
  COUNT(DISTINCT project) as unique_projects
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type;

COMMENT ON VIEW notification_stats_24h IS 'Estadísticas de notificaciones de las últimas 24 horas';

-- Vista para subscriptions activas
CREATE OR REPLACE VIEW active_push_subscriptions AS
SELECT
  id,
  endpoint,
  created_at,
  updated_at
FROM push_subscriptions
WHERE active = true
  AND (expiration_time IS NULL OR expiration_time > EXTRACT(EPOCH FROM NOW()) * 1000);

COMMENT ON VIEW active_push_subscriptions IS 'Suscripciones de push activas y no expiradas';
