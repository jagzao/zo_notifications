import { httpRequestDuration, httpRequestsTotal } from '../services/metrics.js';

/**
 * Middleware para capturar métricas de HTTP requests
 */
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Capturar cuando la respuesta finaliza
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convertir a segundos
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode;

    // Registrar duración
    httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode
      },
      duration
    );

    // Incrementar contador
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode
    });
  });

  next();
}

export default metricsMiddleware;
