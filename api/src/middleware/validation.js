import Joi from 'joi';
import logger from '../services/logger.js';

// Schema para notificación de éxito
export const successNotificationSchema = Joi.object({
  project: Joi.string().required().min(1).max(100),
  title: Joi.string().required().min(1).max(200),
  message: Joi.string().required().min(1).max(1000),
  metadata: Joi.object().optional(),
  priority: Joi.string().valid('low', 'normal', 'high').optional().default('normal'),
  tags: Joi.array().items(Joi.string()).optional(),
});

// Schema para notificación de error
export const errorNotificationSchema = Joi.object({
  project: Joi.string().required().min(1).max(100),
  title: Joi.string().required().min(1).max(200),
  error: Joi.object({
    message: Joi.string().required(),
    stack: Joi.string().optional(),
    code: Joi.string().optional(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional().default('medium'),
  }).required(),
  context: Joi.object().optional(),
  metadata: Joi.object().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

// Schema para notificación de warning
export const warningNotificationSchema = Joi.object({
  project: Joi.string().required().min(1).max(100),
  title: Joi.string().required().min(1).max(200),
  message: Joi.string().required().min(1).max(1000),
  metadata: Joi.object().optional(),
  priority: Joi.string().valid('low', 'normal', 'high').optional().default('normal'),
  tags: Joi.array().items(Joi.string()).optional(),
});

// Schema para notificación informativa
export const infoNotificationSchema = Joi.object({
  project: Joi.string().required().min(1).max(100),
  title: Joi.string().required().min(1).max(200),
  message: Joi.string().required().min(1).max(1000),
  metadata: Joi.object().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

// Schema para Web Push subscription
export const webPushSubscriptionSchema = Joi.object({
  endpoint: Joi.string().uri().required(),
  keys: Joi.object({
    p256dh: Joi.string().required(),
    auth: Joi.string().required(),
  }).required(),
  expirationTime: Joi.number().optional().allow(null),
});

// Middleware de validación
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));

      logger.warn('Validation error', {
        path: req.path,
        details
      });

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details
      });
    }

    req.body = value;
    next();
  };
};
