import config from '../config/index.js';
import logger from '../services/logger.js';

// Middleware para validar API Key
export const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Request without API key', {
      ip: req.ip,
      path: req.path
    });

    return res.status(401).json({
      success: false,
      error: 'API key is required',
      message: 'Please provide X-API-Key header'
    });
  }

  // TODO: En producción, validar contra DB
  // Por ahora, validación simple
  if (apiKey.length < 10) {
    logger.warn('Invalid API key', {
      ip: req.ip,
      path: req.path
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  // Adjuntar API key al request para uso posterior
  req.apiKey = apiKey;

  next();
};

// Middleware para rutas públicas (health check, etc)
export const publicRoute = (req, res, next) => {
  next();
};
