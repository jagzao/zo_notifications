import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/index.js';
import logger from './services/logger.js';
import database from './services/database.js';
import redis from './services/redis.js';
import { rateLimitByIP } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import healthRoutes from './routes/health.js';
import notificationRoutes from './routes/notifications.js';
import webpushRoutes from './routes/webpush.js';
import statsRoutes from './routes/stats.js';

// Crear app Express
const app = express();
const httpServer = createServer(app);

// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware globales
app.use(helmet()); // Seguridad headers
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));
app.use(rateLimitByIP); // Rate limiting por IP

// Logger de requests
app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/notify', notificationRoutes);
app.use('/api/v1/webpush', webpushRoutes);
app.use('/api/v1/stats', statsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ZO Notifications API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      notifications: '/api/v1/notify',
      webpush: '/api/v1/webpush',
      stats: '/api/v1/stats'
    }
  });
});

// Error handlers (deben ir al final)
app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket - Gestión de conexiones
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });

  socket.on('error', (error) => {
    logger.error('WebSocket error', { socketId: socket.id, error: error.message });
  });
});

// Suscribirse a Redis para distribuir notificaciones a todos los clientes WebSocket
async function subscribeToNotifications() {
  try {
    await redis.subscribe('notifications', (notification) => {
      logger.debug('Broadcasting notification to WebSocket clients', {
        id: notification.id,
        type: notification.type
      });

      // Emitir a todos los clientes conectados
      io.emit('notification', notification);
    });

    logger.info('Subscribed to Redis notifications channel');
  } catch (error) {
    logger.error('Error subscribing to Redis', { error: error.message });
  }
}

// Función de inicialización
async function initialize() {
  try {
    // Conectar a PostgreSQL
    await database.connect();
    logger.info('PostgreSQL initialized');

    // Conectar a Redis
    await redis.connect();
    logger.info('Redis initialized');

    // Suscribirse a notificaciones
    await subscribeToNotifications();

    // Iniciar servidor
    httpServer.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`, {
        environment: config.nodeEnv,
        port: config.port
      });
    });
  } catch (error) {
    logger.error('Failed to initialize server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Manejo de señales de terminación
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    // Cerrar servidor HTTP
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Cerrar conexiones
    await database.close();
    await redis.disconnect();

    logger.info('All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason,
    promise
  });
});

// Iniciar aplicación
initialize();

export default app;
