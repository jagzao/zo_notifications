import pg from 'pg';
import config from '../config/index.js';
import logger from './logger.js';

const { Pool } = pg;

class Database {
  constructor() {
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', { error: err.message });
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      logger.info('PostgreSQL connected successfully');
      client.release();
      return true;
    } catch (error) {
      logger.error('PostgreSQL connection error', { error: error.message });
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Query error', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async close() {
    await this.pool.end();
    logger.info('PostgreSQL pool closed');
  }

  // Health check
  async healthCheck() {
    try {
      await this.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

export default new Database();
