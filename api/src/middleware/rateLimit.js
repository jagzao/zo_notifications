import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../services/logger.js';

// Rate limiter por IP
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

// Rate limiter por API Key (más estricto)
export const rateLimitByAPIKey = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  keyGenerator: (req) => req.apiKey || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('API Key rate limit exceeded', {
      apiKey: req.apiKey?.substring(0, 10) + '...',
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'API key rate limit exceeded',
      retry_after: Math.ceil(config.rateLimit.windowMs / 1000),
      limit: {
        max: config.rateLimit.max,
        window: `${config.rateLimit.windowMs / 1000} seconds`
      }
    });
  }
});
