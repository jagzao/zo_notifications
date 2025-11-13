import { Queue } from 'bullmq';
import config from '../config/index.js';
import logger from './logger.js';

class QueueService {
  constructor() {
    this.connection = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    };

    // Queue para Web Push notifications
    this.webPushQueue = new Queue('webpush-notifications', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600, // 24 horas
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600, // 7 días
        },
      },
    });

    // Queue para Discord notifications
    this.discordQueue = new Queue('discord-notifications', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600,
        },
      },
    });

    // Queue para Slack notifications
    this.slackQueue = new Queue('slack-notifications', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600,
        },
      },
    });

    // Queue para Email notifications
    this.emailQueue = new Queue('email-notifications', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600,
        },
      },
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Web Push Queue events
    this.webPushQueue.on('completed', (job) => {
      logger.info('WebPush job completed', { jobId: job.id });
    });

    this.webPushQueue.on('failed', (job, err) => {
      logger.error('WebPush job failed', {
        jobId: job?.id,
        error: err.message
      });
    });

    // Discord Queue events
    this.discordQueue.on('completed', (job) => {
      logger.info('Discord job completed', { jobId: job.id });
    });

    this.discordQueue.on('failed', (job, err) => {
      logger.error('Discord job failed', {
        jobId: job?.id,
        error: err.message
      });
    });

    // Slack Queue events
    this.slackQueue.on('completed', (job) => {
      logger.info('Slack job completed', { jobId: job.id });
    });

    this.slackQueue.on('failed', (job, err) => {
      logger.error('Slack job failed', {
        jobId: job?.id,
        error: err.message
      });
    });

    // Email Queue events
    this.emailQueue.on('completed', (job) => {
      logger.info('Email job completed', { jobId: job.id });
    });

    this.emailQueue.on('failed', (job, err) => {
      logger.error('Email job failed', {
        jobId: job?.id,
        error: err.message
      });
    });
  }

  // Añadir notificación a Web Push queue
  async addWebPushJob(data, options = {}) {
    try {
      const job = await this.webPushQueue.add('send-push', data, {
        priority: options.priority || 1,
        delay: options.delay || 0,
      });

      logger.info('WebPush job added', { jobId: job.id, data });
      return job;
    } catch (error) {
      logger.error('Error adding WebPush job', { error: error.message });
      throw error;
    }
  }

  // Añadir notificación a Discord queue
  async addDiscordJob(data, options = {}) {
    try {
      const job = await this.discordQueue.add('send-discord', data, {
        priority: options.priority || 1,
        delay: options.delay || 0,
      });

      logger.info('Discord job added', { jobId: job.id, data });
      return job;
    } catch (error) {
      logger.error('Error adding Discord job', { error: error.message });
      throw error;
    }
  }

  // Añadir notificación a Slack queue
  async addSlackJob(data, options = {}) {
    try {
      const job = await this.slackQueue.add('send-slack', data, {
        priority: options.priority || 1,
        delay: options.delay || 0,
      });

      logger.info('Slack job added', { jobId: job.id, data });
      return job;
    } catch (error) {
      logger.error('Error adding Slack job', { error: error.message });
      throw error;
    }
  }

  // Añadir notificación a Email queue
  async addEmailJob(data, options = {}) {
    try {
      const job = await this.emailQueue.add('send-email', data, {
        priority: options.priority || 1,
        delay: options.delay || 0,
      });

      logger.info('Email job added', { jobId: job.id, data });
      return job;
    } catch (error) {
      logger.error('Error adding Email job', { error: error.message });
      throw error;
    }
  }

  // Obtener estadísticas de las queues
  async getStats() {
    const webPushCounts = await this.webPushQueue.getJobCounts();
    const discordCounts = await this.discordQueue.getJobCounts();
    const slackCounts = await this.slackQueue.getJobCounts();
    const emailCounts = await this.emailQueue.getJobCounts();

    return {
      webPush: webPushCounts,
      discord: discordCounts,
      slack: slackCounts,
      email: emailCounts,
    };
  }

  // Health check
  async healthCheck() {
    try {
      const stats = await this.getStats();
      const queueDepth = stats.webPush.waiting + stats.discord.waiting +
                         stats.slack.waiting + stats.email.waiting;

      return {
        status: queueDepth < 1000 ? 'ok' : 'degraded',
        queueDepth,
        stats
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Dead Letter Queue - Obtener jobs fallidos
  async getDLQ(channel = 'all', limit = 50) {
    try {
      const { Redis } = await import('ioredis');
      const redis = new Redis(this.connection);

      const queues = channel === 'all'
        ? ['webpush-notifications', 'discord-notifications', 'slack-notifications', 'email-notifications']
        : [`${channel}-notifications`];

      const dlqJobs = [];

      for (const queueName of queues) {
        const dlqKey = `${queueName}:dlq`;
        const jobs = await redis.lrange(dlqKey, 0, limit - 1);

        dlqJobs.push(...jobs.map(job => ({
          ...JSON.parse(job),
          channel: queueName.replace('-notifications', '')
        })));
      }

      await redis.quit();

      return dlqJobs.sort((a, b) => new Date(b.failedAt) - new Date(a.failedAt));
    } catch (error) {
      logger.error('Error fetching DLQ', { error: error.message });
      throw error;
    }
  }

  // Dead Letter Queue - Obtener conteo de jobs fallidos
  async getDLQCount(channel = 'all') {
    try {
      const { Redis } = await import('ioredis');
      const redis = new Redis(this.connection);

      const queues = channel === 'all'
        ? ['webpush-notifications', 'discord-notifications', 'slack-notifications', 'email-notifications']
        : [`${channel}-notifications`];

      let totalCount = 0;
      const counts = {};

      for (const queueName of queues) {
        const dlqKey = `${queueName}:dlq`;
        const count = await redis.llen(dlqKey);
        const channelName = queueName.replace('-notifications', '');
        counts[channelName] = count;
        totalCount += count;
      }

      await redis.quit();

      return { total: totalCount, byChannel: counts };
    } catch (error) {
      logger.error('Error fetching DLQ count', { error: error.message });
      throw error;
    }
  }

  // Dead Letter Queue - Reintenta un job específico desde DLQ
  async retryFromDLQ(jobId, channel) {
    try {
      const { Redis } = await import('ioredis');
      const redis = new Redis(this.connection);

      const dlqKey = `${channel}-notifications:dlq`;
      const jobs = await redis.lrange(dlqKey, 0, -1);

      for (let i = 0; i < jobs.length; i++) {
        const job = JSON.parse(jobs[i]);
        if (job.jobId === jobId) {
          // Remover del DLQ
          await redis.lrem(dlqKey, 1, jobs[i]);

          // Re-añadir a la queue correspondiente
          let addedJob;
          switch (channel) {
            case 'webpush':
              addedJob = await this.addWebPushJob(job.data);
              break;
            case 'discord':
              addedJob = await this.addDiscordJob(job.data);
              break;
            case 'slack':
              addedJob = await this.addSlackJob(job.data);
              break;
            case 'email':
              addedJob = await this.addEmailJob(job.data);
              break;
          }

          await redis.quit();

          logger.info('Job retried from DLQ', {
            originalJobId: jobId,
            newJobId: addedJob.id,
            channel
          });

          return addedJob;
        }
      }

      await redis.quit();
      throw new Error('Job not found in DLQ');
    } catch (error) {
      logger.error('Error retrying job from DLQ', { error: error.message });
      throw error;
    }
  }

  // Dead Letter Queue - Limpiar DLQ de un canal
  async clearDLQ(channel = 'all') {
    try {
      const { Redis } = await import('ioredis');
      const redis = new Redis(this.connection);

      const queues = channel === 'all'
        ? ['webpush-notifications', 'discord-notifications', 'slack-notifications', 'email-notifications']
        : [`${channel}-notifications`];

      let deletedCount = 0;

      for (const queueName of queues) {
        const dlqKey = `${queueName}:dlq`;
        const count = await redis.llen(dlqKey);
        await redis.del(dlqKey);
        deletedCount += count;
      }

      await redis.quit();

      logger.info('DLQ cleared', { channel, deletedCount });

      return { deletedCount };
    } catch (error) {
      logger.error('Error clearing DLQ', { error: error.message });
      throw error;
    }
  }

  // Cerrar queues
  async close() {
    await this.webPushQueue.close();
    await this.discordQueue.close();
    await this.slackQueue.close();
    await this.emailQueue.close();
    logger.info('Queues closed');
  }
}

export default new QueueService();
