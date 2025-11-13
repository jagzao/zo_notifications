import { Worker } from 'bullmq';
import Redis from 'ioredis';
import axios from 'axios';
import winston from 'winston';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

// Configurar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Conexión a Redis
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Configuración de Slack
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;
const SLACK_USERNAME = process.env.SLACK_USERNAME || 'ZO Notifications';
const SLACK_ICON_EMOJI = process.env.SLACK_ICON_EMOJI || ':bell:';

if (!SLACK_WEBHOOK_URL) {
  logger.error('SLACK_WEBHOOK_URL no está configurado. Worker no puede iniciar.');
  process.exit(1);
}

// Helper: Obtener color según tipo y severidad
function getSlackColor(type, severity) {
  if (type === 'error') {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return '#ffcc00';
      default: return 'danger';
    }
  }

  switch (type) {
    case 'success': return 'good';
    case 'warning': return 'warning';
    case 'info': return '#2196F3';
    default: return '#808080';
  }
}

// Helper: Obtener emoji según tipo
function getEmoji(type) {
  switch (type) {
    case 'success': return ':white_check_mark:';
    case 'error': return ':x:';
    case 'warning': return ':warning:';
    case 'info': return ':information_source:';
    default: return ':bell:';
  }
}

// Crear mensaje de Slack
function createSlackMessage(notification) {
  const emoji = getEmoji(notification.type);
  const color = getSlackColor(notification.type, notification.error?.severity);

  // Attachment principal
  const attachment = {
    color: color,
    title: `${emoji} ${notification.title}`,
    fields: [
      {
        title: 'Proyecto',
        value: notification.project,
        short: true
      },
      {
        title: 'Tipo',
        value: notification.type.toUpperCase(),
        short: true
      }
    ],
    footer: 'ZO Notifications',
    ts: Math.floor(new Date(notification.timestamp).getTime() / 1000)
  };

  // Agregar campos según el tipo de notificación
  if (notification.type === 'error' && notification.error) {
    const error = notification.error;

    attachment.fields.push({
      title: 'Severidad',
      value: error.severity ? error.severity.toUpperCase() : 'UNKNOWN',
      short: true
    });

    if (error.code) {
      attachment.fields.push({
        title: 'Código de Error',
        value: error.code,
        short: true
      });
    }

    if (error.message) {
      attachment.text = `*Error:* ${error.message}`;
    }

    if (error.stack) {
      const stackPreview = error.stack.split('\n').slice(0, 5).join('\n');
      attachment.fields.push({
        title: 'Stack Trace (Preview)',
        value: `\`\`\`\n${stackPreview}\n...\n\`\`\``,
        short: false
      });
    }

    if (error.context) {
      attachment.fields.push({
        title: 'Contexto',
        value: `\`\`\`json\n${JSON.stringify(error.context, null, 2)}\n\`\`\``,
        short: false
      });
    }
  } else if (notification.message) {
    attachment.text = notification.message;
  }

  // Añadir metadata si existe
  if (notification.metadata) {
    const metadataStr = JSON.stringify(notification.metadata, null, 2);
    if (metadataStr !== '{}') {
      attachment.fields.push({
        title: 'Metadata',
        value: `\`\`\`json\n${metadataStr}\n\`\`\``,
        short: false
      });
    }
  }

  // Mensaje principal
  const message = {
    username: SLACK_USERNAME,
    icon_emoji: SLACK_ICON_EMOJI,
    attachments: [attachment]
  };

  // Añadir canal si está configurado
  if (SLACK_CHANNEL) {
    message.channel = SLACK_CHANNEL;
  }

  return message;
}

// Procesar job de notificación
async function processNotification(job) {
  const notification = job.data;

  logger.info('Procesando notificación de Slack', {
    id: notification.notificationId,
    type: notification.type,
    project: notification.project
  });

  try {
    const message = createSlackMessage(notification);

    // Enviar a Slack
    const response = await axios.post(SLACK_WEBHOOK_URL, message, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 segundos
    });

    if (response.status === 200 && response.data === 'ok') {
      logger.info('Notificación enviada a Slack exitosamente', {
        id: notification.notificationId,
        type: notification.type
      });
    } else {
      throw new Error(`Slack respondió con: ${response.status} - ${response.data}`);
    }
  } catch (error) {
    logger.error('Error enviando notificación a Slack', {
      id: notification.notificationId,
      error: error.message,
      response: error.response?.data
    });
    throw error; // Re-throw para que BullMQ lo reintente
  }
}

// Crear worker
const worker = new Worker('slack-notifications', processNotification, {
  connection,
  concurrency: 3, // Procesar 3 jobs simultáneamente
  limiter: {
    max: 50, // Máximo 50 mensajes
    duration: 60000, // Por minuto (Slack tiene límite de ~1 msg/seg)
  },
});

// Event handlers
worker.on('completed', (job) => {
  logger.info('Job completado', { jobId: job.id });
});

worker.on('failed', (job, err) => {
  logger.error('Job falló', {
    jobId: job?.id,
    error: err.message,
    attempts: job?.attemptsMade
  });
});

worker.on('error', (err) => {
  logger.error('Worker error', { error: err.message });
});

// Manejo de señales de terminación
async function shutdown(signal) {
  logger.info(`${signal} recibido, cerrando worker...`);

  try {
    await worker.close();
    await connection.quit();
    logger.info('Worker cerrado correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('Error cerrando worker', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Health check server
const healthApp = express();
const healthPort = process.env.HEALTH_PORT || 3003;

healthApp.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    const redis = new Redis(connection);
    await redis.ping();
    await redis.quit();

    res.json({
      status: 'healthy',
      worker: 'slack',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        redis: 'ok',
        worker: 'ok',
        webhook: !!SLACK_WEBHOOK_URL
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      worker: 'slack',
      error: error.message
    });
  }
});

healthApp.get('/metrics', (req, res) => {
  res.json({
    worker: 'slack',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

const healthServer = healthApp.listen(healthPort, () => {
  logger.info(`Health server listening on port ${healthPort}`);
});

// Close health server on shutdown
const originalShutdown = shutdown;
shutdown = async function(signal) {
  healthServer.close();
  await originalShutdown(signal);
};

logger.info('Slack Worker iniciado', {
  queue: 'slack-notifications',
  concurrency: 3,
  webhookConfigured: !!SLACK_WEBHOOK_URL,
  healthPort
});
