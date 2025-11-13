-- Migración para optimizar performance de rate limiting
-- Añade índices adicionales para queries frecuentes

-- Índice compuesto para queries de cleanup (por created_at)
-- Mejora el performance de cleanup_old_rate_limits()
CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup 
  ON rate_limit_usage(created_at) 
  WHERE created_at < NOW() - INTERVAL '24 hours';

-- Índice parcial para ventanas activas (últimas 24 horas)
-- Mejora queries de rate limiting activo
CREATE INDEX IF NOT EXISTS idx_rate_limit_active_window
  ON rate_limit_usage(api_key, endpoint, window_start)
  WHERE window_start > NOW() - INTERVAL '24 hours';

-- Índice para queries de estadísticas por proyecto
CREATE INDEX IF NOT EXISTS idx_rate_limit_project_stats
  ON rate_limit_usage(project, created_at DESC);

-- Índice para búsquedas por API key y rango de tiempo
CREATE INDEX IF NOT EXISTS idx_rate_limit_api_key_time
  ON rate_limit_usage(api_key, window_start DESC, window_end DESC);

-- Índice BRIN para created_at (eficiente para rangos de tiempo)
-- Ocupa menos espacio que un B-tree
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at_brin
  ON rate_limit_usage USING BRIN (created_at)
  WITH (pages_per_range = 128);

-- Comentarios
COMMENT ON INDEX idx_rate_limit_cleanup IS 'Optimiza limpieza de registros antiguos';
COMMENT ON INDEX idx_rate_limit_active_window IS 'Optimiza verificación de rate limits activos';
COMMENT ON INDEX idx_rate_limit_project_stats IS 'Optimiza queries de estadísticas por proyecto';
COMMENT ON INDEX idx_rate_limit_api_key_time IS 'Optimiza búsquedas históricas por API key';
COMMENT ON INDEX idx_rate_limit_created_at_brin IS 'Índice compacto para rangos de tiempo';

-- Vacuum para reorganizar la tabla después de crear índices
VACUUM ANALYZE rate_limit_usage;

-- Estadísticas de los índices
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'rate_limit_usage'
ORDER BY pg_relation_size(indexname::regclass) DESC;
