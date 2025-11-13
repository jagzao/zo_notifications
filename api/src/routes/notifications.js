import express from 'express';
import {
  validate,
  successNotificationSchema,
  errorNotificationSchema,
  warningNotificationSchema,
  infoNotificationSchema,
} from '../middleware/validation.js';
import { authenticateAPIKey } from '../middleware/auth.js';
import { rateLimitByAPIKey } from '../middleware/rateLimit.js';
import database from '../services/database.js';
import redis from '../services/redis.js';
import queue from '../services/queue.js';
import logger from '../services/logger.js';

const router = express.Router();

// Aplicar autenticación y rate limiting a todas las rutas
router.use(authenticateAPIKey);
router.use(rateLimitByAPIKey);

// Función helper para guardar notificación en DB
async function saveNotification(type, data, apiKey) {
  const query = `
    INSERT INTO notifications (type, project, title, data, api_key, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id, created_at
  `;

  const result = await database.query(query, [
    type,
    data.project,
    data.title,
    JSON.stringify(data),
    apiKey,
  ]);

  return result.rows[0];
}

// POST /api/v1/notify/success - Notificación de éxito
router.post('/success', validate(successNotificationSchema), async (req, res) => {
  try {
    const notification = {
      ...req.body,
      type: 'success',
      timestamp: new Date().toISOString(),
    };

    // Guardar en DB
    const saved = await saveNotification('success', notification, req.apiKey);

    // Añadir a queue de Web Push
    await queue.addWebPushJob({
      notificationId: saved.id,
      ...notification,
    });

    // Publicar en Redis para WebSocket
    await redis.publish('notifications', {
      id: saved.id,
      ...notification,
    });

    logger.info('Success notification created', {
      id: saved.id,
      project: notification.project,
      apiKey: req.apiKey.substring(0, 10) + '...'
    });

    res.status(200).json({
      success: true,
      notification_id: saved.id,
      status: 'queued',
      estimated_delivery: new Date(Date.now() + 5000).toISOString()
    });
  } catch (error) {
    logger.error('Error creating success notification', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

// POST /api/v1/notify/error - Notificación de error
router.post('/error', validate(errorNotificationSchema), async (req, res) => {
  try {
    const notification = {
      ...req.body,
      type: 'error',
      timestamp: new Date().toISOString(),
    };

    // Guardar en DB
    const saved = await saveNotification('error', notification, req.apiKey);

    // Añadir a queue de Discord (errores van a Discord)
    await queue.addDiscordJob({
      notificationId: saved.id,
      ...notification,
    }, {
      priority: notification.error.severity === 'critical' ? 10 : 5
    });

    // También notificar a través de Web Push si es crítico
    if (notification.error.severity === 'critical' || notification.error.severity === 'high') {
      await queue.addWebPushJob({
        notificationId: saved.id,
        ...notification,
      }, {
        priority: 10
      });
    }

    // Publicar en Redis para WebSocket
    await redis.publish('notifications', {
      id: saved.id,
      ...notification,
    });

    logger.info('Error notification created', {
      id: saved.id,
      project: notification.project,
      severity: notification.error.severity,
      apiKey: req.apiKey.substring(0, 10) + '...'
    });

    res.status(200).json({
      success: true,
      notification_id: saved.id,
      status: 'queued',
      discord_sent: true,
      push_sent: notification.error.severity === 'critical' || notification.error.severity === 'high'
    });
  } catch (error) {
    logger.error('Error creating error notification', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

// POST /api/v1/notify/warning - Notificación de advertencia
router.post('/warning', validate(warningNotificationSchema), async (req, res) => {
  try {
    const notification = {
      ...req.body,
      type: 'warning',
      timestamp: new Date().toISOString(),
    };

    // Guardar en DB
    const saved = await saveNotification('warning', notification, req.apiKey);

    // Enviar tanto a Web Push como a Discord
    await queue.addWebPushJob({
      notificationId: saved.id,
      ...notification,
    });

    await queue.addDiscordJob({
      notificationId: saved.id,
      ...notification,
    });

    // Publicar en Redis para WebSocket
    await redis.publish('notifications', {
      id: saved.id,
      ...notification,
    });

    logger.info('Warning notification created', {
      id: saved.id,
      project: notification.project,
      apiKey: req.apiKey.substring(0, 10) + '...'
    });

    res.status(200).json({
      success: true,
      notification_id: saved.id,
      status: 'queued'
    });
  } catch (error) {
    logger.error('Error creating warning notification', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

// POST /api/v1/notify/info - Notificación informativa
router.post('/info', validate(infoNotificationSchema), async (req, res) => {
  try {
    const notification = {
      ...req.body,
      type: 'info',
      timestamp: new Date().toISOString(),
    };

    // Guardar en DB
    const saved = await saveNotification('info', notification, req.apiKey);

    // Solo publicar en WebSocket (no enviar push para info)
    await redis.publish('notifications', {
      id: saved.id,
      ...notification,
    });

    logger.info('Info notification created', {
      id: saved.id,
      project: notification.project,
      apiKey: req.apiKey.substring(0, 10) + '...'
    });

    res.status(200).json({
      success: true,
      notification_id: saved.id,
      status: 'logged'
    });
  } catch (error) {
    logger.error('Error creating info notification', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

export default router;
