import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pg from 'pg';
import webpush from 'web-push';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/webpush-worker.log' }),
  ],
});

// Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
};

// PostgreSQL connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'notifications',
  user: process.env.POSTGRES_USER || 'notifier',
  password: process.env.POSTGRES_PASSWORD,
  max: 10,
});

// Configurar Web Push
if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.WEB_PUSH_EMAIL || 'mailto:admin@example.com',
    process.env.WEB_PUSH_PUBLIC_KEY,
    process.env.WEB_PUSH_PRIVATE_KEY
  );
  logger.info('Web Push configured with VAPID keys');
} else {
  logger.error('Web Push keys not configured!');
}

// Obtener todas las subscriptions activas
async function getActiveSubscriptions() {
  const query = `
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE active = true
      AND (expiration_time IS NULL OR expiration_time > $1)
  `;

  const result = await pool.query(query, [Date.now()]);
  return result.rows;
}

// Marcar subscription como inactiva
async function markSubscriptionInactive(endpoint) {
  const query = 'UPDATE push_subscriptions SET active = false WHERE endpoint = $1';
  await pool.query(query, [endpoint]);
  logger.info('Marked subscription as inactive', { endpoint: endpoint.substring(0, 50) + '...' });
}

// Registrar envío
async function recordDelivery(notificationId, status, error = null) {
  const query = `
    INSERT INTO notification_deliveries (notification_id, channel, status, attempts, last_attempt_at, error_message, created_at)
    VALUES ($1, 'webpush', $2, 1, NOW(), $3, NOW())
    ON CONFLICT (notification_id, channel)
    DO UPDATE SET
      status = EXCLUDED.status,
      attempts = notification_deliveries.attempts + 1,
      last_attempt_at = NOW(),
      error_message = EXCLUDED.error_message
  `;

  await pool.query(query, [notificationId, status, error]);
}

// Procesar job de notificación
async function processNotification(job) {
  const { notificationId, type, project, title, message, error: errorData, priority } = job.data;

  logger.info('Processing notification', {
    jobId: job.id,
    notificationId,
    type,
    project
  });

  try {
    // Obtener subscriptions activas
    const subscriptions = await getActiveSubscriptions();

    if (subscriptions.length === 0) {
      logger.warn('No active subscriptions found');
      await recordDelivery(notificationId, 'failed', 'No active subscriptions');
      return;
    }

    logger.info(`Sending to ${subscriptions.length} subscribers`);

    // Preparar payload
    const notificationBody = type === 'error'
      ? `Error: ${errorData?.message || 'Unknown error'}`
      : message || 'Nueva notificación';

    const payload = JSON.stringify({
      title,
      body: notificationBody,
      icon: '/icon.png',
      badge: '/badge.png',
      tag: `notification-${notificationId}`,
      data: {
        id: notificationId,
        type,
        project,
        timestamp: Date.now(),
      },
      requireInteraction: type === 'error' && (errorData?.severity === 'critical' || errorData?.severity === 'high'),
    });

    // Enviar a todas las subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        logger.debug('Push sent successfully', {
          endpoint: sub.endpoint.substring(0, 50) + '...'
        });
      } catch (error) {
        logger.error('Error sending push notification', {
          endpoint: sub.endpoint.substring(0, 50) + '...',
          error: error.message,
          statusCode: error.statusCode
        });

        // Si el endpoint ya no es válido (410 Gone), marcarlo como inactivo
        if (error.statusCode === 410 || error.statusCode === 404) {
          await markSubscriptionInactive(sub.endpoint);
        }

        throw error;
      }
    });

    // Esperar a que se envíen todas
    const results = await Promise.allSettled(sendPromises);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    logger.info('Batch send completed', {
      total: subscriptions.length,
      success: successCount,
      failed: failureCount
    });

    // Registrar envío
    const status = successCount > 0 ? 'sent' : 'failed';
    await recordDelivery(notificationId, status);

    return { success: successCount, failed: failureCount };
  } catch (error) {
    logger.error('Error processing notification', {
      jobId: job.id,
      notificationId,
      error: error.message,
      stack: error.stack
    });

    await recordDelivery(notificationId, 'failed', error.message);
    throw error;
  }
}

// Crear worker
const worker = new Worker('webpush-notifications', processNotification, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// Event listeners
worker.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    result
  });
});

worker.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job?.id,
    error: error.message
  });
});

worker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    await worker.close();
    await pool.end();
    logger.info('Worker shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info('Web Push Worker started', {
  concurrency: 5,
  redis: `${connection.host}:${connection.port}`
});
