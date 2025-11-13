import express from 'express';
import { authenticateAPIKey } from '../middleware/auth.js';
import database from '../services/database.js';
import queue from '../services/queue.js';
import logger from '../services/logger.js';

const router = express.Router();

// Autenticación para stats
router.use(authenticateAPIKey);

// GET /api/v1/stats - Estadísticas generales
router.get('/', async (req, res) => {
  try {
    const { period = '24h', project } = req.query;

    // Calcular timestamp de inicio según el período
    let timeCondition;
    switch (period) {
    case '24h':
      timeCondition = 'created_at > NOW() - INTERVAL \'24 hours\'';
      break;
    case '7d':
      timeCondition = 'created_at > NOW() - INTERVAL \'7 days\'';
      break;
    case '30d':
      timeCondition = 'created_at > NOW() - INTERVAL \'30 days\'';
      break;
    case 'all':
      timeCondition = '1=1';
      break;
    default:
      timeCondition = 'created_at > NOW() - INTERVAL \'24 hours\'';
    }

    // Filtro de proyecto si se especifica
    const projectCondition = project ? `AND project = $1` : '';
    const params = project ? [project] : [];

    // Total de notificaciones
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE ${timeCondition} ${projectCondition}
    `;
    const totalResult = await database.query(totalQuery, params);

    // Por tipo
    const byTypeQuery = `
      SELECT type, COUNT(*) as count
      FROM notifications
      WHERE ${timeCondition} ${projectCondition}
      GROUP BY type
    `;
    const byTypeResult = await database.query(byTypeQuery, params);

    const byType = {};
    byTypeResult.rows.forEach(row => {
      byType[row.type] = parseInt(row.count, 10);
    });

    // Por proyecto
    const byProjectQuery = `
      SELECT project, COUNT(*) as count
      FROM notifications
      WHERE ${timeCondition}
      GROUP BY project
      ORDER BY count DESC
      LIMIT 10
    `;
    const byProjectResult = await database.query(byProjectQuery);

    const byProject = {};
    byProjectResult.rows.forEach(row => {
      byProject[row.project] = parseInt(row.count, 10);
    });

    // Queue stats
    const queueStats = await queue.getStats();

    res.json({
      period,
      total_notifications: parseInt(totalResult.rows[0].total, 10),
      by_type: byType,
      by_project: byProject,
      queue_stats: queueStats,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching stats', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

export default router;
