import dotenv from 'dotenv';

dotenv.config();

export default {
  // Server
  port: parseInt(process.env.API_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Security
  apiKeySecret: process.env.API_KEY_SECRET || 'change-this-secret',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // PostgreSQL
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'notifications',
    user: process.env.POSTGRES_USER || 'notifier',
    password: process.env.POSTGRES_PASSWORD,
  },

  // Web Push
  webPush: {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
    email: process.env.WEB_PUSH_EMAIL || 'mailto:admin@example.com',
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },

  // Request
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFormat: process.env.LOG_FORMAT || 'json',
};
