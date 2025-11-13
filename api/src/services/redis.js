import { Redis } from 'ioredis';
import config from '../config/index.js';
import logger from './logger.js';

class RedisClient {
  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  async connect() {
    try {
      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Redis connection error', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    await this.client.disconnect();
    logger.info('Redis disconnected');
  }

  // Pub/Sub para WebSocket
  async publish(channel, message) {
    try {
      await this.client.publish(channel, JSON.stringify(message));
      logger.debug('Published to Redis', { channel, message });
    } catch (error) {
      logger.error('Redis publish error', { error: error.message });
      throw error;
    }
  }

  async subscribe(channel, callback) {
    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          logger.error('Error parsing Redis message', { error: error.message });
        }
      }
    });

    return subscriber;
  }

  // Cache
  async get(key) {
    return await this.client.get(key);
  }

  async set(key, value, expirationSeconds = null) {
    if (expirationSeconds) {
      return await this.client.setex(key, expirationSeconds, value);
    }
    return await this.client.set(key, value);
  }

  async del(key) {
    return await this.client.del(key);
  }

  // Health check
  async healthCheck() {
    try {
      await this.client.ping();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

export default new RedisClient();
