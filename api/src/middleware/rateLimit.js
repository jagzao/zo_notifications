import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../services/logger.js';
import pool from '../services/database.js';
import apiKeyCache from '../services/apiKeyCache.js';
import webhookNotifier from '../services/webhookNotifier.js';
import { rateLimitExceeded } from '../services/metrics.js';

// Rate limiter por IP (básico, en memoria)
export const rateLimitByIP = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(config.rateLimit.windowMs / 1000)} seconds`,
      retry_after: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  },
  skip: (req) => {
    // No aplicar rate limit a health check
    return req.path === '/api/v1/health';
  }
});

// Rate limiter por API Key con PostgreSQL (per-project limits)
export const rateLimitByAPIKey = async (req, res, next) => {
  try {
    // Saltar health checks
    if (req.path === '/api/v1/health' || req.path === '/api/v1/metrics') {
      return next();
    }

    const apiKey = req.apiKey || req.headers['x-api-key'];

    if (!apiKey) {
      return next(); // Dejar que auth middleware maneje esto
    }

    // Obtener límites de la API key desde CACHE (Redis) o DB
    const apiKeyData = await apiKeyCache.getAPIKey(apiKey);

    if (!apiKeyData) {
      return next(); // Dejar que auth middleware maneje esto
    }

    const { rate_limit_max, rate_limit_window_ms, tier, project } = apiKeyData;
    const endpoint = req.path;

    // Verificar rate limit usando función SQL
    const rateLimitResult = await pool.query(
      'SELECT * FROM check_rate_limit($1, $2, $3, $4)',
      [apiKey, endpoint, rate_limit_max, rate_limit_window_ms]
    );

    const { allowed, current_count, limit_max, reset_at } = rateLimitResult.rows[0];

    // Calcular porcentaje de uso
    const usage_percentage = (current_count / limit_max) * 100;

    // Establecer headers de rate limiting
    res.setHeader('X-RateLimit-Limit', limit_max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit_max - current_count - 1));
    res.setHeader('X-RateLimit-Reset', new Date(reset_at).getTime() / 1000);
    res.setHeader('X-RateLimit-Tier', tier);

    // Enviar advertencia si está cerca del límite (> 80%)
    if (usage_percentage > 80 && usage_percentage <= 100) {
      webhookNotifier.notifyNearLimit(apiKey, {
        project,
        tier,
        current_count,
        limit_max,
        usage_percentage
      }).catch(err => logger.error('Webhook notification error', { error: err.message }));
    }

    if (!allowed) {
      logger.warn('API Key rate limit exceeded', {
        apiKey: apiKey.substring(0, 10) + '...',
        project,
        tier,
        endpoint,
        current_count,
        limit: limit_max,
        ip: req.ip
      });

      // Incrementar métrica de Prometheus
      rateLimitExceeded.inc({
        api_key: apiKey.substring(0, 10) + '...',
        project,
        tier,
        endpoint
      });

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `API key rate limit exceeded for tier "${tier}"`,
        retry_after: Math.ceil(rate_limit_window_ms / 1000),
        limit: {
          max: limit_max,
          current: current_count,
          window: `${rate_limit_window_ms / 1000} seconds`,
          tier: tier,
          reset_at: reset_at
        }
      });
    }

    // Registrar el request en la DB
    const windowStart = new Date(Date.now() - rate_limit_window_ms);
    const windowEnd = new Date();

    await pool.query(
      `INSERT INTO rate_limit_usage (api_key, project, endpoint, request_count, window_start, window_end)
       VALUES ($1, $2, $3, 1, $4, $5)
       ON CONFLICT (api_key, endpoint, window_start)
       DO UPDATE SET request_count = rate_limit_usage.request_count + 1`,
      [apiKey, project, endpoint, windowStart, windowEnd]
    );

    next();
  } catch (error) {
    logger.error('Rate limit check failed', { error: error.message });
    // En caso de error, permitir el request (fail-open)
    next();
  }
};
