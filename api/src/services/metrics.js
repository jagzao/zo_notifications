import client from 'prom-client';
import logger from './logger.js';

// Registrar métricas por defecto (memoria, CPU, etc.)
const register = new client.Registry();

// Añadir métricas por defecto de Node.js
client.collectDefaultMetrics({ register });

// ======================
// Métricas personalizadas
// ======================

// HTTP: Duración de requests
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5] // Segundos
});
register.registerMetric(httpRequestDuration);

// HTTP: Contador de requests
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestsTotal);

// Notificaciones: Total por tipo
export const notificationsTotal = new client.Counter({
  name: 'notifications_total',
  help: 'Total number of notifications sent',
  labelNames: ['type', 'project']
});
register.registerMetric(notificationsTotal);

// Notificaciones: Duración de procesamiento
export const notificationProcessingDuration = new client.Histogram({
  name: 'notification_processing_duration_seconds',
  help: 'Duration of notification processing in seconds',
  labelNames: ['type', 'worker'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});
register.registerMetric(notificationProcessingDuration);

// Queue: Profundidad actual
export const queueDepth = new client.Gauge({
  name: 'queue_depth',
  help: 'Current depth of the notification queues',
  labelNames: ['queue_name', 'state'] // state: waiting, active, completed, failed
});
register.registerMetric(queueDepth);

// Queue: Jobs procesados
export const queueJobsProcessed = new client.Counter({
  name: 'queue_jobs_processed_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue_name', 'status'] // status: completed, failed
});
register.registerMetric(queueJobsProcessed);

// WebSocket: Conexiones activas
export const websocketConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});
register.registerMetric(websocketConnections);

// WebSocket: Mensajes enviados
export const websocketMessagesTotal = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages sent',
  labelNames: ['event_type']
});
register.registerMetric(websocketMessagesTotal);

// Database: Conexiones activas
export const databaseConnections = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});
register.registerMetric(databaseConnections);

// Database: Query duration
export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});
register.registerMetric(databaseQueryDuration);

// Redis: Operaciones
export const redisOperations = new client.Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'] // operation: get, set, publish, subscribe
});
register.registerMetric(redisOperations);

// API Keys: Requests por API key
export const apiKeyRequests = new client.Counter({
  name: 'api_key_requests_total',
  help: 'Total number of requests per API key',
  labelNames: ['api_key_name', 'project']
});
register.registerMetric(apiKeyRequests);

// Rate Limiting: Requests bloqueadas
export const rateLimitBlocked = new client.Counter({
  name: 'rate_limit_blocked_total',
  help: 'Total number of requests blocked by rate limiting',
  labelNames: ['limiter_type'] // limiter_type: ip, api_key
});
register.registerMetric(rateLimitBlocked);

// Errores: Total por tipo
export const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'severity']
});
register.registerMetric(errorsTotal);

// Dead Letter Queue: Tamaño actual
export const dlqSize = new client.Gauge({
  name: 'dlq_size',
  help: 'Current number of jobs in Dead Letter Queue',
  labelNames: ['channel'] // channel: webpush, discord, slack, email
});
register.registerMetric(dlqSize);

// Dead Letter Queue: Jobs movidos a DLQ
export const dlqJobsTotal = new client.Counter({
  name: 'dlq_jobs_total',
  help: 'Total number of jobs moved to DLQ',
  labelNames: ['channel', 'error_type']
});
register.registerMetric(dlqJobsTotal);

// Dead Letter Queue: Jobs reintentados desde DLQ
export const dlqRetriesTotal = new client.Counter({
  name: 'dlq_retries_total',
  help: 'Total number of jobs retried from DLQ',
  labelNames: ['channel', 'status'] // status: success, failed
});
register.registerMetric(dlqRetriesTotal);

// Rate Limiting: Uso actual por API key
export const rateLimitUsage = new client.Gauge({
  name: 'rate_limit_usage',
  help: 'Current rate limit usage per API key',
  labelNames: ['api_key', 'project', 'tier']
});
register.registerMetric(rateLimitUsage);

// Rate Limiting: Límite máximo por API key
export const rateLimitMax = new client.Gauge({
  name: 'rate_limit_max',
  help: 'Maximum rate limit per API key',
  labelNames: ['api_key', 'project', 'tier']
});
register.registerMetric(rateLimitMax);

// Rate Limiting: Requests excedidos (429)
export const rateLimitExceeded = new client.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['api_key', 'project', 'tier', 'endpoint']
});
register.registerMetric(rateLimitExceeded);

// ======================
// Funciones auxiliares
// ======================

/**
 * Actualiza las métricas de queue desde BullMQ
 * @param {Object} queues - Objeto con las queues {webpush: Queue, discord: Queue}
 */
export async function updateQueueMetrics(queues) {
  try {
    for (const [name, queue] of Object.entries(queues)) {
      // Obtener contadores
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');

      queueDepth.set({ queue_name: name, state: 'waiting' }, counts.waiting || 0);
      queueDepth.set({ queue_name: name, state: 'active' }, counts.active || 0);
      queueDepth.set({ queue_name: name, state: 'completed' }, counts.completed || 0);
      queueDepth.set({ queue_name: name, state: 'failed' }, counts.failed || 0);
    }
  } catch (error) {
    logger.error('Error updating queue metrics', { error: error.message });
  }
}

/**
 * Actualiza métricas de base de datos
 * @param {Object} pool - Pool de PostgreSQL
 */
export function updateDatabaseMetrics(pool) {
  try {
    databaseConnections.set(pool.totalCount);
  } catch (error) {
    logger.error('Error updating database metrics', { error: error.message });
  }
}

/**
 * Actualiza métricas de DLQ desde Redis
 * @param {Object} queueService - Servicio de queues
 */
export async function updateDLQMetrics(queueService) {
  try {
    const counts = await queueService.getDLQCount('all');

    // Actualizar gauge por canal
    for (const [channel, count] of Object.entries(counts.byChannel)) {
      dlqSize.set({ channel }, count);
    }
  } catch (error) {
    logger.error('Error updating DLQ metrics', { error: error.message });
  }
}

/**
 * Actualiza métricas de rate limiting desde DB
 * @param {Object} pool - Pool de PostgreSQL
 */
export async function updateRateLimitMetrics(pool) {
  try {
    // Obtener uso actual de rate limits
    const result = await pool.query(`
      SELECT
        ak.key,
        ak.project,
        ak.tier,
        ak.rate_limit_max,
        COALESCE(SUM(rlu.request_count), 0) as current_usage
      FROM api_keys ak
      LEFT JOIN rate_limit_usage rlu ON rlu.api_key = ak.key
        AND rlu.window_start > NOW() - (ak.rate_limit_window_ms || ' milliseconds')::INTERVAL
      WHERE ak.active = true
      GROUP BY ak.key, ak.project, ak.tier, ak.rate_limit_max
    `);

    for (const row of result.rows) {
      const labels = {
        api_key: row.key.substring(0, 10) + '...',
        project: row.project,
        tier: row.tier
      };

      rateLimitUsage.set(labels, parseInt(row.current_usage));
      rateLimitMax.set(labels, row.rate_limit_max);
    }
  } catch (error) {
    logger.error('Error updating rate limit metrics', { error: error.message });
  }
}

/**
 * Obtiene todas las métricas en formato Prometheus
 */
export async function getMetrics() {
  return register.metrics();
}

/**
 * Obtiene el content type para las métricas
 */
export function getMetricsContentType() {
  return register.contentType;
}

export default {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  notificationsTotal,
  notificationProcessingDuration,
  queueDepth,
  queueJobsProcessed,
  websocketConnections,
  websocketMessagesTotal,
  databaseConnections,
  databaseQueryDuration,
  redisOperations,
  apiKeyRequests,
  rateLimitBlocked,
  errorsTotal,
  dlqSize,
  dlqJobsTotal,
  dlqRetriesTotal,
  rateLimitUsage,
  rateLimitMax,
  rateLimitExceeded,
  updateQueueMetrics,
  updateDatabaseMetrics,
  updateDLQMetrics,
  updateRateLimitMetrics,
  getMetrics,
  getMetricsContentType
};
