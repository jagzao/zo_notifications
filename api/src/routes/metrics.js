import express from 'express';
import { getMetrics, getMetricsContentType } from '../services/metrics.js';

const router = express.Router();

/**
 * GET /metrics
 * Endpoint para Prometheus scraping
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getMetricsContentType());
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

export default router;
