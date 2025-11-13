import express from 'express';
import pool from '../services/database.js';
import logger from '../services/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/v1/usage - Obtener uso actual del API key
router.get('/', requireAuth, async (req, res) => {
  try {
    const apiKey = req.apiKey || req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // Obtener info de la API key
    const apiKeyResult = await pool.query(
      `SELECT 
        key, 
        name, 
        project, 
        tier, 
        rate_limit_max, 
        rate_limit_window_ms,
        created_at
      FROM api_keys 
      WHERE key = $1 AND active = true`,
      [apiKey]
    );

    if (apiKeyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    const apiKeyData = apiKeyResult.rows[0];

    // Calcular uso actual (última ventana)
    const currentUsageResult = await pool.query(
      `SELECT COALESCE(SUM(request_count), 0) as current_usage
       FROM rate_limit_usage
       WHERE api_key = $1
         AND window_start > NOW() - ($2 || ' milliseconds')::INTERVAL`,
      [apiKey, apiKeyData.rate_limit_window_ms]
    );

    const currentUsage = parseInt(currentUsageResult.rows[0].current_usage);
    const usagePercentage = (currentUsage / apiKeyData.rate_limit_max) * 100;

    // Estadísticas de las últimas 24 horas
    const stats24hResult = await pool.query(
      `SELECT 
        COUNT(*) as total_windows,
        SUM(request_count) as total_requests,
        MAX(request_count) as peak_requests,
        COUNT(DISTINCT endpoint) as unique_endpoints
       FROM rate_limit_usage
       WHERE api_key = $1
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [apiKey]
    );

    const stats24h = stats24hResult.rows[0];

    // Top endpoints (últimas 24h)
    const topEndpointsResult = await pool.query(
      `SELECT 
        endpoint,
        SUM(request_count) as total_requests,
        COUNT(*) as hit_count
       FROM rate_limit_usage
       WHERE api_key = $1
         AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY endpoint
       ORDER BY total_requests DESC
       LIMIT 10`,
      [apiKey]
    );

    // Historial por hora (últimas 24h)
    const hourlyStatsResult = await pool.query(
      `SELECT 
        date_trunc('hour', created_at) as hour,
        SUM(request_count) as requests
       FROM rate_limit_usage
       WHERE api_key = $1
         AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY hour
       ORDER BY hour DESC`,
      [apiKey]
    );

    res.json({
      success: true,
      data: {
        api_key: {
          name: apiKeyData.name,
          project: apiKeyData.project,
          tier: apiKeyData.tier,
          created_at: apiKeyData.created_at
        },
        rate_limit: {
          max: apiKeyData.rate_limit_max,
          window_seconds: apiKeyData.rate_limit_window_ms / 1000,
          current_usage: currentUsage,
          remaining: Math.max(0, apiKeyData.rate_limit_max - currentUsage),
          usage_percentage: parseFloat(usagePercentage.toFixed(2)),
          reset_at: new Date(Date.now() + apiKeyData.rate_limit_window_ms).toISOString()
        },
        stats_24h: {
          total_requests: parseInt(stats24h.total_requests) || 0,
          total_windows: parseInt(stats24h.total_windows) || 0,
          peak_requests: parseInt(stats24h.peak_requests) || 0,
          unique_endpoints: parseInt(stats24h.unique_endpoints) || 0,
          avg_requests_per_hour: Math.round((parseInt(stats24h.total_requests) || 0) / 24)
        },
        top_endpoints: topEndpointsResult.rows,
        hourly_stats: hourlyStatsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching usage data', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage data',
      message: error.message
    });
  }
});

// GET /api/v1/usage/history - Historial detallado
router.get('/history', requireAuth, async (req, res) => {
  try {
    const apiKey = req.apiKey || req.headers['x-api-key'];
    const { days = 7, endpoint } = req.query;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    const daysInt = Math.min(parseInt(days), 30); // Máximo 30 días

    let query = `
      SELECT 
        endpoint,
        request_count,
        window_start,
        window_end,
        created_at
      FROM rate_limit_usage
      WHERE api_key = $1
        AND created_at > NOW() - ($2 || ' days')::INTERVAL
    `;

    const params = [apiKey, daysInt];

    if (endpoint) {
      query += ' AND endpoint = $3';
      params.push(endpoint);
    }

    query += ' ORDER BY created_at DESC LIMIT 1000';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        days: daysInt,
        endpoint: endpoint || 'all',
        total_records: result.rows.length,
        records: result.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching usage history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage history',
      message: error.message
    });
  }
});

// GET /api/v1/usage/tiers - Información de tiers disponibles
router.get('/tiers', async (req, res) => {
  try {
    const tiers = [
      {
        name: 'free',
        rate_limit: 100,
        window_seconds: 60,
        description: 'Ideal para desarrollo y testing',
        price: '$0/mes',
        features: [
          '100 requests/minuto',
          'Acceso a API completa',
          'Soporte comunidad',
          'Sin tarjeta de crédito'
        ]
      },
      {
        name: 'basic',
        rate_limit: 500,
        window_seconds: 60,
        description: 'Para proyectos pequeños en producción',
        price: '$9/mes',
        features: [
          '500 requests/minuto',
          'Acceso a API completa',
          'Soporte por email',
          'Métricas avanzadas'
        ]
      },
      {
        name: 'pro',
        rate_limit: 2000,
        window_seconds: 60,
        description: 'Para proyectos medianos',
        price: '$29/mes',
        features: [
          '2000 requests/minuto',
          'Acceso a API completa',
          'Soporte prioritario',
          'Webhooks personalizados',
          'SLA 99.9%'
        ]
      },
      {
        name: 'unlimited',
        rate_limit: 999999,
        window_seconds: 60,
        description: 'Para empresas',
        price: 'Contactar',
        features: [
          'Sin límites de requests',
          'Acceso a API completa',
          'Soporte 24/7',
          'Integración personalizada',
          'SLA 99.99%',
          'Dedicated infrastructure'
        ]
      }
    ];

    res.json({
      success: true,
      data: {
        tiers,
        current_tier: req.apiKey ? 'Consulta /api/v1/usage para ver tu tier' : null
      }
    });
  } catch (error) {
    logger.error('Error fetching tiers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tiers',
      message: error.message
    });
  }
});

export default router;
