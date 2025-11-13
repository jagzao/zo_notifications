import express from 'express';
import database from '../services/database.js';
import redis from '../services/redis.js';
import queue from '../services/queue.js';
import logger from '../services/logger.js';

const router = express.Router();

// Uptime
const startTime = Date.now();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const checks = {
      redis: await redis.healthCheck(),
      postgres: await database.healthCheck(),
      queue: await queue.healthCheck(),
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'ok');
    const anyDegraded = Object.values(checks).some(check => check.status === 'degraded');

    const status = allHealthy ? 'healthy' : anyDegraded ? 'degraded' : 'unhealthy';

    const response = {
      status,
      checks,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0'
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check error', { error: error.message });

    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
