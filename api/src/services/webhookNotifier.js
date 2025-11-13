import axios from 'axios';
import logger from './logger.js';
import pool from './database.js';

class WebhookNotifier {
  constructor() {
    this.sentNotifications = new Map();
    this.notificationCooldown = 300000; // 5 minutos
  }

  async notifyNearLimit(apiKey, data) {
    try {
      const { project, tier, current_count, limit_max, usage_percentage } = data;

      const cacheKey = `${apiKey}:near_limit`;
      const lastNotification = this.sentNotifications.get(cacheKey);

      if (lastNotification && Date.now() - lastNotification < this.notificationCooldown) {
        logger.debug('Webhook notification skipped (cooldown)', { apiKey: apiKey.substring(0, 10) + '...' });
        return;
      }

      const webhookResult = await pool.query(
        'SELECT name, project, webhook_url FROM api_keys WHERE key = $1 AND webhook_url IS NOT NULL',
        [apiKey]
      );

      if (webhookResult.rows.length === 0) {
        return;
      }

      const { name, webhook_url } = webhookResult.rows[0];

      const payload = {
        event: 'rate_limit.warning',
        timestamp: new Date().toISOString(),
        api_key: { name, project },
        rate_limit: {
          tier,
          current_usage: current_count,
          max_limit: limit_max,
          usage_percentage: parseFloat(usage_percentage.toFixed(2)),
          remaining: limit_max - current_count
        },
        message: `Your API key "${name}" has reached ${usage_percentage.toFixed(0)}% of its rate limit (${current_count}/${limit_max} requests).`,
        actions: [
          'Consider upgrading your tier',
          'Reduce request frequency',
          'Implement request batching'
        ]
      };

      await axios.post(webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ZO-Notifications-Webhooks/1.0'
        },
        timeout: 5000
      });

      this.sentNotifications.set(cacheKey, Date.now());

      logger.info('Webhook notification sent', {
        apiKey: apiKey.substring(0, 10) + '...',
        project,
        usage_percentage: usage_percentage.toFixed(2)
      });
    } catch (error) {
      logger.error('Error sending webhook notification', {
        error: error.message,
        apiKey: apiKey.substring(0, 10) + '...'
      });
    }
  }

  async notifyLimitExceeded(apiKey, data) {
    try {
      const { project, tier, current_count, limit_max } = data;

      const webhookResult = await pool.query(
        'SELECT name, project, webhook_url FROM api_keys WHERE key = $1 AND webhook_url IS NOT NULL',
        [apiKey]
      );

      if (webhookResult.rows.length === 0) {
        return;
      }

      const { name, webhook_url } = webhookResult.rows[0];

      const payload = {
        event: 'rate_limit.exceeded',
        timestamp: new Date().toISOString(),
        api_key: { name, project },
        rate_limit: {
          tier,
          current_usage: current_count,
          max_limit: limit_max
        },
        message: `Rate limit exceeded for API key "${name}". Requests are being throttled.`,
        http_status: 429
      };

      await axios.post(webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ZO-Notifications-Webhooks/1.0'
        },
        timeout: 5000
      });

      logger.info('Webhook limit exceeded sent', {
        apiKey: apiKey.substring(0, 10) + '...',
        project
      });
    } catch (error) {
      logger.error('Error sending limit exceeded webhook', {
        error: error.message,
        apiKey: apiKey.substring(0, 10) + '...'
      });
    }
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.sentNotifications.entries()) {
      if (now - timestamp > 3600000) {
        this.sentNotifications.delete(key);
      }
    }
  }
}

export default new WebhookNotifier();
