/**
 * ZO Notifications - Cliente JavaScript/Node.js
 * =============================================
 *
 * Cliente simplificado para enviar notificaciones
 *
 * Instalación:
 *   npm install axios
 *
 * Uso:
 *   const ZONotifications = require('./zo-notifications');
 *   const notifier = new ZONotifications('tu-api-key');
 *   await notifier.success('mi-app', 'Proceso completado', 'Todo OK!');
 */

const axios = require('axios');

class ZONotifications {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'http://localhost:3000/api/v1';
    this.timeout = options.timeout || 10000;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });

    // Retry automático
    this.client.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;

        if (!config || !config.retry) {
          config.retry = 0;
        }

        config.retry += 1;

        if (config.retry <= 3 && error.code === 'ECONNREFUSED') {
          await new Promise(resolve => setTimeout(resolve, 1000 * config.retry));
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Enviar notificación de éxito
   */
  async success(project, title, message, metadata = {}) {
    try {
      const { data } = await this.client.post('/notify/success', {
        project,
        title,
        message,
        metadata,
        tags: metadata.tags || []
      });
      return data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Enviar notificación de error
   */
  async error(project, title, errorData, context = {}) {
    try {
      // Si errorData es un Error object, extraer info
      if (errorData instanceof Error) {
        errorData = {
          message: errorData.message,
          stack: errorData.stack,
          code: errorData.code,
          severity: 'high'
        };
      }

      const { data } = await this.client.post('/notify/error', {
        project,
        title,
        error: errorData,
        context
      });
      return data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Enviar notificación de advertencia
   */
  async warning(project, title, message, metadata = {}) {
    try {
      const { data } = await this.client.post('/notify/warning', {
        project,
        title,
        message,
        metadata
      });
      return data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Enviar notificación informativa
   */
  async info(project, title, message, metadata = {}) {
    try {
      const { data } = await this.client.post('/notify/info', {
        project,
        title,
        message,
        metadata
      });
      return data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats(period = '24h', project = null) {
    try {
      const params = { period };
      if (project) params.project = project;

      const { data } = await this.client.get('/stats', { params });
      return data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Verificar health del sistema
   */
  async health() {
    try {
      const { data } = await this.client.get('/health');
      return data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Wrapper para promesas - captura errores automáticamente
   */
  wrap(project, fn, options = {}) {
    return async (...args) => {
      const startTime = Date.now();

      try {
        const result = await fn(...args);

        if (options.notifySuccess !== false) {
          await this.success(
            project,
            options.successTitle || `${fn.name} completado`,
            options.successMessage || `La función ${fn.name} se ejecutó correctamente`,
            {
              duration: Date.now() - startTime,
              ...options.metadata
            }
          );
        }

        return result;
      } catch (error) {
        await this.error(
          project,
          options.errorTitle || `Error en ${fn.name}`,
          {
            message: error.message,
            stack: error.stack,
            severity: options.errorSeverity || 'high'
          },
          {
            function: fn.name,
            args: JSON.stringify(args).substring(0, 200),
            duration: Date.now() - startTime
          }
        );

        throw error;
      }
    };
  }

  /**
   * Manejo de errores interno
   */
  _handleError(error) {
    if (error.response) {
      // Error de respuesta del servidor
      const err = new Error(error.response.data.error || 'API Error');
      err.statusCode = error.response.status;
      err.response = error.response.data;
      throw err;
    } else if (error.request) {
      // Error de red
      throw new Error('Network error: Could not reach ZO Notifications API');
    } else {
      throw error;
    }
  }
}

module.exports = ZONotifications;

// Export para ES modules también
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = ZONotifications;
}
