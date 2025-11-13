# API Documentation - ZO Notifications

Documentación completa de la API REST del sistema de notificaciones.

## 🔐 Autenticación

Todas las peticiones requieren un API Key en el header:

```http
X-API-Key: tu-api-key-aqui
```

**Ejemplo**:
```bash
curl -H "X-API-Key: abc123..." http://localhost:3000/api/v1/health
```

## 📍 Base URL

```
http://localhost:3000/api/v1
```

Para producción con SSL:
```
https://tu-dominio.com/api/v1
```

## 🚦 Endpoints

### Health Check

Verifica el estado del sistema.

```http
GET /health
```

**No requiere autenticación**

**Respuesta 200 OK**:
```json
{
  "status": "healthy",
  "checks": {
    "redis": "ok",
    "postgres": "ok",
    "workers": "ok",
    "queue": "ok"
  },
  "timestamp": "2025-11-13T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

**Respuesta 503 Service Unavailable**:
```json
{
  "status": "unhealthy",
  "checks": {
    "redis": "error",
    "postgres": "ok",
    "workers": "degraded"
  },
  "timestamp": "2025-11-13T10:30:00Z"
}
```

---

### Notificación de Éxito

Envía una notificación de éxito (push notification).

```http
POST /notify/success
```

**Headers**:
```
Content-Type: application/json
X-API-Key: tu-api-key
```

**Body**:
```json
{
  "project": "mi-aplicacion",
  "title": "Deploy exitoso",
  "message": "La aplicación se desplegó correctamente en producción",
  "metadata": {
    "version": "1.2.3",
    "environment": "production",
    "deploy_time": "45s"
  }
}
```

**Parámetros**:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| project | string | ✅ | Identificador del proyecto |
| title | string | ✅ | Título de la notificación |
| message | string | ✅ | Mensaje descriptivo |
| metadata | object | ❌ | Datos adicionales (opcional) |
| priority | string | ❌ | "low", "normal", "high" (default: "normal") |
| tags | array | ❌ | Tags para categorización |

**Respuesta 200 OK**:
```json
{
  "success": true,
  "notification_id": "notif_abc123",
  "status": "queued",
  "estimated_delivery": "2025-11-13T10:30:05Z"
}
```

**Respuesta 400 Bad Request**:
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "field": "title",
    "message": "Title is required"
  }
}
```

**Respuesta 429 Too Many Requests**:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retry_after": 60,
  "limit": {
    "max": 100,
    "window": "1 hour",
    "remaining": 0
  }
}
```

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/api/v1/notify/success \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu-api-key" \
  -d '{
    "project": "mi-app",
    "title": "Deploy exitoso",
    "message": "Versión 1.2.3 desplegada",
    "metadata": {
      "version": "1.2.3",
      "environment": "production"
    }
  }'
```

---

### Notificación de Error

Envía una notificación de error (Discord webhook con detalles).

```http
POST /notify/error
```

**Headers**:
```
Content-Type: application/json
X-API-Key: tu-api-key
```

**Body**:
```json
{
  "project": "mi-api",
  "title": "Error en endpoint de usuarios",
  "error": {
    "message": "Database connection timeout",
    "stack": "Error: Connection timeout after 30000ms\n  at Database.connect (db.js:45:10)\n  at async handler (routes.js:120:5)",
    "code": "ETIMEDOUT",
    "severity": "high"
  },
  "context": {
    "endpoint": "/api/users",
    "method": "GET",
    "user_id": "12345",
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  },
  "metadata": {
    "environment": "production",
    "server": "web-01",
    "memory_usage": "85%"
  }
}
```

**Parámetros**:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| project | string | ✅ | Identificador del proyecto |
| title | string | ✅ | Título del error |
| error | object | ✅ | Detalles del error |
| error.message | string | ✅ | Mensaje del error |
| error.stack | string | ❌ | Stack trace completo |
| error.code | string | ❌ | Código de error |
| error.severity | string | ❌ | "low", "medium", "high", "critical" |
| context | object | ❌ | Contexto donde ocurrió el error |
| metadata | object | ❌ | Información adicional |
| tags | array | ❌ | Tags para categorización |

**Respuesta 200 OK**:
```json
{
  "success": true,
  "notification_id": "notif_xyz789",
  "status": "queued",
  "discord_sent": true,
  "push_sent": false
}
```

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/api/v1/notify/error \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu-api-key" \
  -d '{
    "project": "mi-api",
    "title": "Error en producción",
    "error": {
      "message": "Database connection timeout",
      "stack": "Error: Connection timeout...",
      "severity": "high"
    },
    "context": {
      "endpoint": "/api/users",
      "method": "GET"
    }
  }'
```

---

### Notificación de Advertencia

Envía una notificación de advertencia (push + Discord).

```http
POST /notify/warning
```

**Headers**:
```
Content-Type: application/json
X-API-Key: tu-api-key
```

**Body**:
```json
{
  "project": "mi-app",
  "title": "Uso de memoria alto",
  "message": "El servidor está usando 85% de memoria",
  "metadata": {
    "memory_used": "3.4GB",
    "memory_total": "4GB",
    "server": "web-01"
  }
}
```

**Respuesta 200 OK**:
```json
{
  "success": true,
  "notification_id": "notif_warn123",
  "status": "queued"
}
```

---

### Notificación Informativa

Envía una notificación informativa (solo logging).

```http
POST /notify/info
```

**Headers**:
```
Content-Type: application/json
X-API-Key: tu-api-key
```

**Body**:
```json
{
  "project": "mi-app",
  "title": "Backup completado",
  "message": "Backup diario completado exitosamente",
  "metadata": {
    "backup_size": "1.2GB",
    "duration": "5m 32s"
  }
}
```

---

### Estadísticas

Obtiene estadísticas de uso del sistema.

```http
GET /stats
```

**Headers**:
```
X-API-Key: tu-api-key
```

**Query Parameters**:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| period | string | "24h", "7d", "30d", "all" (default: "24h") |
| project | string | Filtrar por proyecto específico |

**Respuesta 200 OK**:
```json
{
  "period": "24h",
  "total_notifications": 1247,
  "by_type": {
    "success": 980,
    "error": 45,
    "warning": 122,
    "info": 100
  },
  "by_project": {
    "mi-app": 500,
    "mi-api": 300,
    "data-pipeline": 447
  },
  "delivery_stats": {
    "push_sent": 980,
    "push_failed": 12,
    "discord_sent": 167,
    "discord_failed": 0
  },
  "avg_processing_time_ms": 145,
  "queue_depth": 3
}
```

**Ejemplo cURL**:
```bash
# Estadísticas últimas 24h
curl -H "X-API-Key: tu-api-key" \
  "http://localhost:3000/api/v1/stats?period=24h"

# Estadísticas de un proyecto específico
curl -H "X-API-Key: tu-api-key" \
  "http://localhost:3000/api/v1/stats?project=mi-app&period=7d"
```

---

### Historial de Notificaciones

Obtiene el historial de notificaciones enviadas.

```http
GET /history
```

**Headers**:
```
X-API-Key: tu-api-key
```

**Query Parameters**:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| page | number | Número de página (default: 1) |
| limit | number | Items por página (default: 50, max: 100) |
| project | string | Filtrar por proyecto |
| type | string | Filtrar por tipo (success/error/warning/info) |
| from | string | Fecha desde (ISO 8601) |
| to | string | Fecha hasta (ISO 8601) |

**Respuesta 200 OK**:
```json
{
  "page": 1,
  "limit": 50,
  "total": 1247,
  "pages": 25,
  "data": [
    {
      "id": "notif_abc123",
      "type": "success",
      "project": "mi-app",
      "title": "Deploy exitoso",
      "message": "Versión 1.2.3 desplegada",
      "status": "delivered",
      "created_at": "2025-11-13T10:30:00Z",
      "delivered_at": "2025-11-13T10:30:02Z"
    },
    {
      "id": "notif_xyz789",
      "type": "error",
      "project": "mi-api",
      "title": "Error en producción",
      "status": "delivered",
      "created_at": "2025-11-13T10:25:00Z",
      "delivered_at": "2025-11-13T10:25:01Z"
    }
  ]
}
```

**Ejemplo cURL**:
```bash
# Últimas 50 notificaciones
curl -H "X-API-Key: tu-api-key" \
  "http://localhost:3000/api/v1/history"

# Errores de las últimas 24 horas
curl -H "X-API-Key: tu-api-key" \
  "http://localhost:3000/api/v1/history?type=error&from=2025-11-12T10:00:00Z"
```

---

### Obtener Notificación por ID

Obtiene detalles completos de una notificación específica.

```http
GET /notifications/:id
```

**Headers**:
```
X-API-Key: tu-api-key
```

**Respuesta 200 OK**:
```json
{
  "id": "notif_abc123",
  "type": "success",
  "project": "mi-app",
  "title": "Deploy exitoso",
  "message": "Versión 1.2.3 desplegada",
  "metadata": {
    "version": "1.2.3",
    "environment": "production"
  },
  "status": "delivered",
  "delivery_channels": {
    "push": {
      "sent": true,
      "sent_at": "2025-11-13T10:30:02Z",
      "attempts": 1
    },
    "discord": {
      "sent": false,
      "reason": "Not applicable for success type"
    }
  },
  "created_at": "2025-11-13T10:30:00Z",
  "updated_at": "2025-11-13T10:30:02Z"
}
```

**Respuesta 404 Not Found**:
```json
{
  "success": false,
  "error": "Notification not found"
}
```

---

## 🔄 Estados de Notificación

| Estado | Descripción |
|--------|-------------|
| queued | En cola para procesamiento |
| processing | Siendo procesada por un worker |
| delivered | Entregada exitosamente |
| failed | Falló después de todos los reintentos |
| grouped | Agrupada con otras notificaciones similares |

## ⚠️ Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Validación falló |
| 401 | Unauthorized - API Key inválida |
| 404 | Not Found - Recurso no encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |
| 503 | Service Unavailable - Sistema no disponible |

## 📊 Rate Limiting

### Límites por API Key

- **100 requests** por minuto
- **1000 requests** por hora
- **10000 requests** por día

### Límites de Push Notifications

- **10 push notifications** por hora (configurable)
- Agrupación inteligente de mensajes similares
- Horarios de silencio configurables

### Headers de Rate Limit

Cada respuesta incluye headers informativos:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699876543
```

## 🔐 Mejores Prácticas de Seguridad

1. **API Keys**:
   - Nunca expongas las API keys en el código
   - Usa variables de entorno
   - Rota las keys periódicamente
   - Una key por proyecto/servicio

2. **HTTPS**:
   - Siempre usa HTTPS en producción
   - Valida certificados SSL

3. **Validación**:
   - Valida todos los inputs
   - Limita el tamaño de requests (max 10MB)
   - Sanitiza datos antes de enviar

4. **Monitoring**:
   - Monitorea uso anómalo
   - Configura alertas de rate limiting
   - Revisa logs regularmente

## 📝 Ejemplos Completos

### Script Bash Completo

```bash
#!/bin/bash

API_KEY="tu-api-key"
API_URL="http://localhost:3000/api/v1"
PROJECT="mi-script"

notify() {
  local type=$1
  local title=$2
  local message=$3

  curl -s -X POST "$API_URL/notify/$type" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{
      \"project\": \"$PROJECT\",
      \"title\": \"$title\",
      \"message\": \"$message\"
    }"
}

# Uso
if ./backup.sh; then
  notify "success" "Backup completado" "Backup exitoso de 1.2GB"
else
  notify "error" "Backup falló" "Error al realizar backup: $?"
fi
```

### Cliente Python

```python
import requests
from typing import Optional, Dict

class ZONotifications:
    def __init__(self, api_key: str, base_url: str = "http://localhost:3000/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": api_key
        }

    def _send(self, endpoint: str, data: Dict) -> Dict:
        response = requests.post(
            f"{self.base_url}/{endpoint}",
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def success(self, project: str, title: str, message: str, metadata: Optional[Dict] = None):
        return self._send("notify/success", {
            "project": project,
            "title": title,
            "message": message,
            "metadata": metadata or {}
        })

    def error(self, project: str, title: str, error: Dict, context: Optional[Dict] = None):
        return self._send("notify/error", {
            "project": project,
            "title": title,
            "error": error,
            "context": context or {}
        })

    def health(self) -> Dict:
        response = requests.get(f"{self.base_url}/health")
        return response.json()

# Uso
notifier = ZONotifications(api_key="tu-api-key")

try:
    result = process_data()
    notifier.success(
        project="data-pipeline",
        title="ETL completado",
        message=f"Procesados {result['records']} registros",
        metadata={"duration": result['duration']}
    )
except Exception as e:
    notifier.error(
        project="data-pipeline",
        title="Error en ETL",
        error={
            "message": str(e),
            "stack": traceback.format_exc(),
            "severity": "high"
        }
    )
```

### Cliente Node.js/TypeScript

```typescript
import axios, { AxiosInstance } from 'axios';

interface NotificationResponse {
  success: boolean;
  notification_id: string;
  status: string;
}

class ZONotifications {
  private client: AxiosInstance;

  constructor(apiKey: string, baseURL: string = 'http://localhost:3000/api/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });
  }

  async success(
    project: string,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<NotificationResponse> {
    const { data } = await this.client.post('/notify/success', {
      project,
      title,
      message,
      metadata
    });
    return data;
  }

  async error(
    project: string,
    title: string,
    error: {
      message: string;
      stack?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    },
    context?: Record<string, any>
  ): Promise<NotificationResponse> {
    const { data } = await this.client.post('/notify/error', {
      project,
      title,
      error,
      context
    });
    return data;
  }

  async health() {
    const { data } = await this.client.get('/health');
    return data;
  }

  async stats(period: '24h' | '7d' | '30d' | 'all' = '24h') {
    const { data } = await this.client.get('/stats', {
      params: { period }
    });
    return data;
  }
}

// Uso
const notifier = new ZONotifications('tu-api-key');

try {
  await myAsyncFunction();
  await notifier.success('mi-app', 'Proceso completado', 'Todo OK');
} catch (error) {
  await notifier.error('mi-app', 'Error en proceso', {
    message: error.message,
    stack: error.stack,
    severity: 'high'
  });
}
```

---

## 📚 Recursos Adicionales

- [Quick Start Guide](./QUICK_START.md)
- [Plan de Desarrollo](../PLAN_DESARROLLO.md)
- [Decisiones Técnicas](./DECISIONES_TECNICAS.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## 💬 Soporte

Para preguntas o problemas con la API:
- Abre un issue en el repositorio
- Consulta los logs: `docker-compose logs -f`
- Verifica el health check: `/api/v1/health`
