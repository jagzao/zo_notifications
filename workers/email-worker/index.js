import { Worker } from 'bullmq';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import winston from 'winston';
import dotenv from 'dotenv';

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

// Configuración de Email
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const EMAIL_TO = process.env.EMAIL_TO;

if (!EMAIL_USER || !EMAIL_PASSWORD || !EMAIL_TO) {
  logger.error('EMAIL_USER, EMAIL_PASSWORD o EMAIL_TO no están configurados. Worker no puede iniciar.');
  process.exit(1);
}

// Crear transporter de nodemailer
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

// Verificar configuración al iniciar
transporter.verify((error, success) => {
  if (error) {
    logger.error('Error verificando configuración de email', { error: error.message });
  } else {
    logger.info('Servidor de email listo');
  }
});

// Helper: Obtener color según tipo
function getColorForType(type, severity) {
  if (type === 'error') {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#17a2b8';
      default: return '#dc3545';
    }
  }

  switch (type) {
    case 'success': return '#28a745';
    case 'warning': return '#ffc107';
    case 'info': return '#17a2b8';
    default: return '#6c757d';
  }
}

// Helper: Obtener emoji según tipo
function getEmoji(type) {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '🔔';
  }
}

// Crear HTML del email
function createEmailHTML(notification) {
  const emoji = getEmoji(notification.type);
  const color = getColorForType(notification.type, notification.error?.severity);

  let content = '';

  if (notification.type === 'error' && notification.error) {
    const error = notification.error;

    content += `
      <div style="margin: 20px 0;">
        <p><strong>Severidad:</strong> <span style="color: ${color}; font-weight: bold;">${error.severity?.toUpperCase() || 'UNKNOWN'}</span></p>
        ${error.code ? `<p><strong>Código:</strong> ${error.code}</p>` : ''}
        ${error.message ? `<p><strong>Mensaje:</strong> ${error.message}</p>` : ''}
      </div>
    `;

    if (error.stack) {
      content += `
        <div style="margin: 20px 0;">
          <p><strong>Stack Trace:</strong></p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${error.stack}</pre>
        </div>
      `;
    }

    if (error.context) {
      content += `
        <div style="margin: 20px 0;">
          <p><strong>Contexto:</strong></p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${JSON.stringify(error.context, null, 2)}</pre>
        </div>
      `;
    }
  } else if (notification.message) {
    content += `
      <div style="margin: 20px 0;">
        <p>${notification.message}</p>
      </div>
    `;
  }

  if (notification.metadata && Object.keys(notification.metadata).length > 0) {
    content += `
      <div style="margin: 20px 0;">
        <p><strong>Metadata:</strong></p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${JSON.stringify(notification.metadata, null, 2)}</pre>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${notification.title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-left: 4px solid ${color}; padding-left: 20px; margin-bottom: 30px;">
        <h2 style="margin: 0 0 10px 0; color: ${color};">
          ${emoji} ${notification.title}
        </h2>
        <p style="margin: 0; color: #666; font-size: 14px;">
          <strong>Proyecto:</strong> ${notification.project} |
          <strong>Tipo:</strong> ${notification.type.toUpperCase()}
        </p>
      </div>

      ${content}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
        <p>
          ZO Notifications<br>
          ${new Date(notification.timestamp).toLocaleString('es-ES', {
            dateStyle: 'full',
            timeStyle: 'long'
          })}
        </p>
      </div>
    </body>
    </html>
  `;
}

// Crear texto plano del email
function createEmailText(notification) {
  const emoji = getEmoji(notification.type);

  let text = `${emoji} ${notification.title}\n\n`;
  text += `Proyecto: ${notification.project}\n`;
  text += `Tipo: ${notification.type.toUpperCase()}\n`;
  text += `Fecha: ${new Date(notification.timestamp).toLocaleString('es-ES')}\n\n`;

  if (notification.type === 'error' && notification.error) {
    const error = notification.error;
    text += `Severidad: ${error.severity?.toUpperCase() || 'UNKNOWN'}\n`;
    if (error.code) text += `Código: ${error.code}\n`;
    if (error.message) text += `Mensaje: ${error.message}\n\n`;
    if (error.stack) text += `Stack Trace:\n${error.stack}\n\n`;
    if (error.context) text += `Contexto:\n${JSON.stringify(error.context, null, 2)}\n\n`;
  } else if (notification.message) {
    text += `${notification.message}\n\n`;
  }

  if (notification.metadata && Object.keys(notification.metadata).length > 0) {
    text += `Metadata:\n${JSON.stringify(notification.metadata, null, 2)}\n`;
  }

  text += `\n---\nZO Notifications`;

  return text;
}

// Procesar job de notificación
async function processNotification(job) {
  const notification = job.data;

  logger.info('Procesando notificación de email', {
    id: notification.notificationId,
    type: notification.type,
    project: notification.project
  });

  try {
    const emoji = getEmoji(notification.type);
    const subject = `${emoji} [${notification.project}] ${notification.title}`;

    const mailOptions = {
      from: `"ZO Notifications" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: subject,
      text: createEmailText(notification),
      html: createEmailHTML(notification),
      priority: notification.type === 'error' && notification.error?.severity === 'critical' ? 'high' : 'normal'
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email enviado exitosamente', {
      id: notification.notificationId,
      messageId: info.messageId,
      type: notification.type
    });
  } catch (error) {
    logger.error('Error enviando email', {
      id: notification.notificationId,
      error: error.message
    });
    throw error; // Re-throw para que BullMQ lo reintente
  }
}

// Crear worker
const worker = new Worker('email-notifications', processNotification, {
  connection,
  concurrency: 2, // Procesar 2 emails simultáneamente
  limiter: {
    max: 20, // Máximo 20 emails
    duration: 60000, // Por minuto (para evitar rate limiting del proveedor)
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
    transporter.close();
    logger.info('Worker cerrado correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('Error cerrando worker', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info('Email Worker iniciado', {
  queue: 'email-notifications',
  concurrency: 2,
  host: EMAIL_HOST,
  from: EMAIL_FROM,
  to: EMAIL_TO
});
