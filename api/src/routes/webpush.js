import express from 'express';
import webpush from 'web-push';
import { validate, webPushSubscriptionSchema } from '../middleware/validation.js';
import database from '../services/database.js';
import config from '../config/index.js';
import logger from '../services/logger.js';

const router = express.Router();

// Configurar web-push con las VAPID keys
if (config.webPush.publicKey && config.webPush.privateKey) {
  webpush.setVapidDetails(
    config.webPush.email,
    config.webPush.publicKey,
    config.webPush.privateKey
  );
}

// GET /api/v1/webpush/public-key - Obtener la clave pública
router.get('/public-key', (req, res) => {
  if (!config.webPush.publicKey) {
    return res.status(503).json({
      success: false,
      error: 'Web Push not configured',
      message: 'Please configure WEB_PUSH_PUBLIC_KEY'
    });
  }

  res.json({
    success: true,
    publicKey: config.webPush.publicKey
  });
});

// POST /api/v1/webpush/subscribe - Suscribirse a notificaciones
router.post('/subscribe', validate(webPushSubscriptionSchema), async (req, res) => {
  try {
    const subscription = req.body;

    // Guardar subscription en DB
    const query = `
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, expiration_time, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (endpoint)
      DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        expiration_time = EXCLUDED.expiration_time,
        updated_at = NOW()
      RETURNING id
    `;

    const result = await database.query(query, [
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      subscription.expirationTime
    ]);

    logger.info('Push subscription saved', {
      id: result.rows[0].id,
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    res.status(201).json({
      success: true,
      message: 'Subscription saved successfully',
      subscriptionId: result.rows[0].id
    });
  } catch (error) {
    logger.error('Error saving push subscription', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to save subscription',
      message: error.message
    });
  }
});

// DELETE /api/v1/webpush/unsubscribe - Cancelar suscripción
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required'
      });
    }

    const query = 'DELETE FROM push_subscriptions WHERE endpoint = $1';
    await database.query(query, [endpoint]);

    logger.info('Push subscription removed', {
      endpoint: endpoint.substring(0, 50) + '...'
    });

    res.json({
      success: true,
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    logger.error('Error removing push subscription', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to remove subscription',
      message: error.message
    });
  }
});

// POST /api/v1/webpush/test - Enviar notificación de prueba
router.post('/test', async (req, res) => {
  try {
    // Obtener todas las subscriptions activas
    const query = 'SELECT * FROM push_subscriptions WHERE active = true LIMIT 1';
    const result = await database.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active subscriptions found',
        message: 'Please subscribe first from the dashboard'
      });
    }

    const subscription = {
      endpoint: result.rows[0].endpoint,
      keys: {
        p256dh: result.rows[0].p256dh,
        auth: result.rows[0].auth
      }
    };

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'This is a test notification from ZO Notifications',
      icon: '/icon.png',
      badge: '/badge.png',
      timestamp: Date.now()
    });

    await webpush.sendNotification(subscription, payload);

    logger.info('Test push notification sent');

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    logger.error('Error sending test push notification', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

export default router;
