import express from 'express';
import queueService from '../services/queue.js';
import logger from '../services/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/v1/dlq - Obtener jobs en Dead Letter Queue
router.get('/', requireAuth, async (req, res) => {
  try {
    const { channel = 'all', limit = 50 } = req.query;

    const dlqJobs = await queueService.getDLQ(channel, parseInt(limit, 10));
    const counts = await queueService.getDLQCount(channel);

    res.json({
      success: true,
      data: {
        jobs: dlqJobs,
        counts: counts,
        total: dlqJobs.length
      }
    });
  } catch (error) {
    logger.error('Error fetching DLQ', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DLQ',
      message: error.message
    });
  }
});

// GET /api/v1/dlq/count - Obtener conteo de jobs en DLQ
router.get('/count', requireAuth, async (req, res) => {
  try {
    const { channel = 'all' } = req.query;

    const counts = await queueService.getDLQCount(channel);

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    logger.error('Error fetching DLQ count', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DLQ count',
      message: error.message
    });
  }
});

// POST /api/v1/dlq/retry/:jobId - Reintentar un job desde DLQ
router.post('/retry/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { channel } = req.body;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: 'Channel is required'
      });
    }

    const retriedJob = await queueService.retryFromDLQ(jobId, channel);

    res.json({
      success: true,
      message: 'Job retried successfully',
      data: {
        originalJobId: jobId,
        newJobId: retriedJob.id,
        channel
      }
    });
  } catch (error) {
    logger.error('Error retrying job from DLQ', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retry job',
      message: error.message
    });
  }
});

// DELETE /api/v1/dlq - Limpiar DLQ
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { channel = 'all' } = req.query;

    const result = await queueService.clearDLQ(channel);

    res.json({
      success: true,
      message: `DLQ cleared for ${channel}`,
      data: result
    });
  } catch (error) {
    logger.error('Error clearing DLQ', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to clear DLQ',
      message: error.message
    });
  }
});

export default router;
