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
  updateQueueMetrics,
  updateDatabaseMetrics,
  getMetrics,
  getMetricsContentType
};
