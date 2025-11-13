import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pg from 'pg';
import axios from 'axios';
import winston from 'winston';
import dotenv from 'dotenv';
import express from 'express';

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
    new winston.transports.File({ filename: 'logs/discord-worker.log' }),
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

// Discord Webhook URL
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_USERNAME = process.env.DISCORD_USERNAME || 'ZO Notifications';
const DISCORD_AVATAR_URL = process.env.DISCORD_AVATAR_URL;

if (!DISCORD_WEBHOOK_URL) {
  logger.error('DISCORD_WEBHOOK_URL not configured!');
}

// Registrar envío
async function recordDelivery(notificationId, status, error = null) {
  const query = `
    INSERT INTO notification_deliveries (notification_id, channel, status, attempts, last_attempt_at, error_message, created_at)
    VALUES ($1, 'discord', $2, 1, NOW(), $3, NOW())
    ON CONFLICT (notification_id, channel)
    DO UPDATE SET
      status = EXCLUDED.status,
      attempts = notification_deliveries.attempts + 1,
      last_attempt_at = NOW(),
      error_message = EXCLUDED.error_message
  `;

  await pool.query(query, [notificationId, status, error]);
}

// Obtener color según el tipo
function getEmbedColor(type, severity = null) {
  if (type === 'error') {
    switch (severity) {
    case 'critical':
      return 0xFF0000; // Rojo brillante
    case 'high':
      return 0xDC3545; // Rojo
    case 'medium':
      return 0xFFC107; // Amarillo
    case 'low':
      return 0xFF9800; // Naranja
    default:
      return 0xEF4444; // Rojo default
    }
  } else if (type === 'warning') {
    return 0xF59E0B; // Amarillo
  } else if (type === 'success') {
    return 0x10B981; // Verde
  } else {
    return 0x3B82F6; // Azul
  }
}

// Truncar texto largo
function truncate(text, maxLength = 1024) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Crear embed para Discord
function createEmbed(notification) {
  const { type, project, title, error: errorData, context, metadata, timestamp } = notification;

  const embed = {
    title: `${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'} ${title}`,
    color: getEmbedColor(type, errorData?.severity),
    timestamp: timestamp || new Date().toISOString(),
    footer: {
      text: `Proyecto: ${project} | Tipo: ${type}`
    },
    fields: [],
  };

  // Error details
  if (type === 'error' && errorData) {
    if (errorData.severity) {
      embed.fields.push({
        name: '🔴 Severidad',
        value: errorData.severity.toUpperCase(),
        inline: true
      });
    }

    if (errorData.code) {
      embed.fields.push({
        name: '🏷️ Código',
        value: errorData.code,
        inline: true
      });
    }

    // Mensaje de error
    embed.fields.push({
      name: '💬 Mensaje',
      value: truncate(errorData.message, 1024),
      inline: false
    });

    // Stack trace (si existe y no es muy largo)
    if (errorData.stack) {
      const stack = truncate(errorData.stack, 1000);
      embed.fields.push({
        name: '📋 Stack Trace',
        value: `\`\`\`javascript\n${stack}\n\`\`\``,
        inline: false
      });
    }
  } else if (type === 'warning' && notification.message) {
    embed.fields.push({
      name: '💬 Mensaje',
      value: truncate(notification.message, 1024),
      inline: false
    });
  }

  // Context
  if (context && Object.keys(context).length > 0) {
    const contextLines = Object.entries(context)
      .slice(0, 5)
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');

    embed.fields.push({
      name: '🔍 Contexto',
      value: truncate(contextLines, 1024),
      inline: false
    });
  }

  // Metadata
  if (metadata && Object.keys(metadata).length > 0) {
    const metadataLines = Object.entries(metadata)
      .slice(0, 5)
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');

    if (metadataLines) {
      embed.fields.push({
        name: '📊 Metadata',
        value: truncate(metadataLines, 1024),
        inline: false
      });
    }
  }

  return embed;
}

// Enviar mensaje a Discord
async function sendToDiscord(notification) {
  if (!DISCORD_WEBHOOK_URL) {
    throw new Error('Discord webhook URL not configured');
  }

  const embed = createEmbed(notification);

  const payload = {
    username: DISCORD_USERNAME,
    avatar_url: DISCORD_AVATAR_URL,
    embeds: [embed],
  };

  try {
    const response = await axios.post(DISCORD_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      logger.error('Discord API error', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(`Discord API error: ${error.response.status}`);
    }
    throw error;
  }
}

// Procesar job de notificación
async function processNotification(job) {
  const { notificationId, type, project, title } = job.data;

  logger.info('Processing Discord notification', {
    jobId: job.id,
    notificationId,
    type,
    project
  });

  try {
    // Enviar a Discord
    await sendToDiscord(job.data);

    logger.info('Discord notification sent successfully', {
      jobId: job.id,
      notificationId
    });

    // Registrar envío exitoso
    await recordDelivery(notificationId, 'sent');

    return { success: true };
  } catch (error) {
    logger.error('Error sending Discord notification', {
      jobId: job.id,
      notificationId,
      error: error.message,
      stack: error.stack
    });

    // Registrar fallo
    await recordDelivery(notificationId, 'failed', error.message);
    throw error;
  }
}

// Crear worker
const worker = new Worker('discord-notifications', processNotification, {
  connection,
  concurrency: 3,
  limiter: {
    max: 5,
    duration: 2000, // Discord rate limit: ~5 mensajes por 2 segundos
  },
});

// Event listeners
worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id });
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

// Health check server
const healthApp = express();
const healthPort = process.env.HEALTH_PORT || 3002;

healthApp.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    const redis = new Redis(connection);
    await redis.ping();
    await redis.quit();

    // Check PostgreSQL connection
    await pool.query('SELECT 1');

    res.json({
      status: 'healthy',
      worker: 'discord',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        redis: 'ok',
        postgres: 'ok',
        worker: 'ok',
        webhook: !!DISCORD_WEBHOOK_URL
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      worker: 'discord',
      error: error.message
    });
  }
});

healthApp.get('/metrics', (req, res) => {
  res.json({
    worker: 'discord',
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

logger.info('Discord Worker started', {
  concurrency: 3,
  redis: `${connection.host}:${connection.port}`,
  webhookConfigured: !!DISCORD_WEBHOOK_URL,
  healthPort
});
