import { Redis } from 'ioredis';
import config from '../config/index.js';
import logger from './logger.js';
import pool from './database.js';

class APIKeyCache {
  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });

    // TTL de cache: 5 minutos
    this.cacheTTL = 300;
  }

  /**
   * Obtiene una API key desde cache o DB
   * @param {string} apiKey - La API key
   * @returns {Object|null} - Datos de la API key o null si no existe
   */
  async getAPIKey(apiKey) {
    try {
      // 1. Intentar obtener desde Redis
      const cacheKey = `apikey:${apiKey}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('API key from cache', { apiKey: apiKey.substring(0, 10) + '...' });
        return JSON.parse(cached);
      }

      // 2. No está en cache, obtener de PostgreSQL
      const result = await pool.query(
        'SELECT key, name, project, tier, rate_limit_max, rate_limit_window_ms, active FROM api_keys WHERE key = $1 AND active = true',
        [apiKey]
      );

      if (result.rows.length === 0) {
        // API key no existe o no está activa
        // Cachear resultado negativo por 1 minuto para evitar queries repetidas
        await this.redis.setex(cacheKey, 60, JSON.stringify(null));
        return null;
      }

      const apiKeyData = result.rows[0];

      // 3. Guardar en cache
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(apiKeyData));

      logger.debug('API key from DB (cached)', { apiKey: apiKey.substring(0, 10) + '...' });

      return apiKeyData;
    } catch (error) {
      logger.error('Error getting API key', { error: error.message });
      
      // En caso de error de cache, intentar obtener directamente de DB
      try {
        const result = await pool.query(
          'SELECT key, name, project, tier, rate_limit_max, rate_limit_window_ms, active FROM api_keys WHERE key = $1 AND active = true',
          [apiKey]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
      } catch (dbError) {
        logger.error('Error getting API key from DB', { error: dbError.message });
        return null;
      }
    }
  }

  /**
   * Invalida el cache de una API key específica
   * @param {string} apiKey - La API key
   */
  async invalidate(apiKey) {
    try {
      const cacheKey = `apikey:${apiKey}`;
      await this.redis.del(cacheKey);
      logger.info('API key cache invalidated', { apiKey: apiKey.substring(0, 10) + '...' });
    } catch (error) {
      logger.error('Error invalidating API key cache', { error: error.message });
    }
  }

  /**
   * Invalida todo el cache de API keys
   */
  async invalidateAll() {
    try {
      const keys = await this.redis.keys('apikey:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('All API key cache invalidated', { count: keys.length });
      }
    } catch (error) {
      logger.error('Error invalidating all API key cache', { error: error.message });
    }
  }

  /**
   * Precarga API keys activas en cache (útil al inicio)
   */
  async warmup() {
    try {
      const result = await pool.query(
        'SELECT key, name, project, tier, rate_limit_max, rate_limit_window_ms, active FROM api_keys WHERE active = true'
      );

      let warmed = 0;
      for (const apiKeyData of result.rows) {
        const cacheKey = `apikey:${apiKeyData.key}`;
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(apiKeyData));
        warmed++;
      }

      logger.info('API key cache warmed up', { count: warmed });
    } catch (error) {
      logger.error('Error warming up API key cache', { error: error.message });
    }
  }

  /**
   * Cierra la conexión a Redis
   */
  async close() {
    await this.redis.quit();
  }
}

export default new APIKeyCache();
