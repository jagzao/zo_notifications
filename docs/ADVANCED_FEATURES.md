# Características Avanzadas - ZO Notifications

Este documento describe las características avanzadas implementadas en el sistema de notificaciones.

## 📋 Tabla de Contenidos

- [Workers Condicionales](#workers-condicionales)
- [Rate Limiting por Proyecto](#rate-limiting-por-proyecto)
- [Dead Letter Queue (DLQ)](#dead-letter-queue-dlq)

---

## 🔧 Workers Condicionales

Los workers se inician **solo si están configurados**, ahorrando recursos cuando no se usan ciertos canales.

### Cómo Funciona

Docker Compose usa **profiles** para activar/desactivar workers:

- **WebPush Worker**: Siempre activo (es el core del sistema)
- **Discord Worker**: Solo si `DISCORD_WEBHOOK_URL` está configurado
- **Slack Worker**: Solo si `SLACK_WEBHOOK_URL` está configurado
- **Email Worker**: Solo si `EMAIL_USER` y `EMAIL_PASSWORD` están configurados

### Uso Manual

```bash
# Solo WebPush (por defecto)
docker-compose up -d

# WebPush + Discord
COMPOSE_PROFILES=discord docker-compose up -d

# WebPush + Discord + Slack
COMPOSE_PROFILES=discord,slack docker-compose up -d

# Todos los workers
COMPOSE_PROFILES=discord,slack,email docker-compose up -d
```

### Uso con Script Inteligente

El script `scripts/start.sh` **detecta automáticamente** qué workers están configurados:

```bash
# Detecta automáticamente y pregunta qué hacer
./scripts/start.sh

# Producción con detección automática
./scripts/start.sh prod
```

**Ejemplo de salida:**

```
╔════════════════════════════════════════╗
║   ZO Notifications - Smart Startup    ║
╚════════════════════════════════════════╝

📦 Modo: DESARROLLO

Detectando workers configurados...

✅ WebPush Worker - Siempre activo (core)
✅ Discord Worker - Configurado
⏭️  Slack Worker - No configurado (saltando)
⏭️  Email Worker - No configurado (saltando)

🎯 Profiles activos: discord
```

### Beneficios

- ✅ **Ahorro de recursos**: No corre workers que no usas
- ✅ **Menos contenedores**: Solo los necesarios
- ✅ **Menos memoria**: ~100-150MB ahorrados por worker no usado
- ✅ **Setup más rápido**: Menos servicios que iniciar
- ✅ **Zero config**: El script detecta todo automáticamente

---

## ⚡ Rate Limiting por Proyecto

Sistema de rate limiting **diferenciado por tier** de API key, almacenado en PostgreSQL.

### Tiers Disponibles

| Tier | Límite | Ventana | Uso |
|------|--------|---------|-----|
| `free` | 100 req/min | 60s | Desarrollo, testing |
| `basic` | 500 req/min | 60s | Proyectos pequeños |
| `pro` | 2000 req/min | 60s | Proyectos medianos |
| `unlimited` | 999999 req/min | 60s | Proyectos enterprise |

### Configuración de API Keys

#### 1. Crear API Key en Base de Datos

```sql
INSERT INTO api_keys (key, name, project, tier, active)
VALUES (
  'my-production-key-abc123',
  'My Production App',
  'my-app-v1',
  'pro',
  true
);
```

#### 2. Usar en Requests

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "X-API-Key: my-production-key-abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "success",
    "project": "my-app-v1",
    "title": "Deployment Complete",
    "message": "v2.1.0 deployed successfully"
  }'
```

#### 3. Headers de Respuesta

El servidor devuelve headers informativos:

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 2000
X-RateLimit-Remaining: 1999
X-RateLimit-Reset: 1699564800
X-RateLimit-Tier: pro
```

#### 4. Cuando se Excede el Límite

```json
{
  "success": false,
  "error": "Too many requests",
  "message": "API key rate limit exceeded for tier \"pro\"",
  "retry_after": 60,
  "limit": {
    "max": 2000,
    "current": 2001,
    "window": "60 seconds",
    "tier": "pro",
    "reset_at": "2024-11-09T20:00:00.000Z"
  }
}
```

### Monitoreo de Rate Limits

#### Ver Estadísticas

```sql
-- Uso por proyecto (últimos 7 días)
SELECT * FROM rate_limit_stats;

-- Conteo actual de requests
SELECT 
  api_key, 
  project, 
  SUM(request_count) as total_requests
FROM rate_limit_usage
WHERE window_start > NOW() - INTERVAL '1 hour'
GROUP BY api_key, project;
```

#### Cleanup Automático

La tabla `rate_limit_usage` se limpia automáticamente:

```sql
-- Función que limpia datos > 24h
SELECT cleanup_old_rate_limits();
```

Puedes programar esto en un cron job:

```bash
# Limpiar rate limits viejos cada hora
0 * * * * docker exec zo_postgres psql -U notifier -d notifications -c "SELECT cleanup_old_rate_limits();"
```

### Funciones SQL Disponibles

```sql
-- Verificar si un request está permitido
SELECT * FROM check_rate_limit(
  'my-api-key',           -- API key
  '/api/v1/notify',       -- Endpoint
  2000,                   -- Max requests
  60000                   -- Window (ms)
);
```

### Beneficios

- ✅ **Diferentes límites por proyecto**: No afecta a otros proyectos
- ✅ **Persistente en DB**: No se pierde al reiniciar
- ✅ **Tracking detallado**: Auditoría por endpoint
- ✅ **Escalable**: Funciona en cluster con múltiples APIs
- ✅ **Monetización**: Fácil implementar tiers pagos

---

## 🔄 Dead Letter Queue (DLQ)

Sistema para capturar y gestionar notificaciones que **fallan después de múltiples reintentos**.

### Cómo Funciona

1. Un job falla (ej: webhook caído, endpoint inválido)
2. Se reintenta con **exponential backoff**: 10s → 30s → 90s → 270s
3. Después de `MAX_JOB_ATTEMPTS` (default: 3), se mueve a **DLQ**
4. Queda almacenado en Redis por **7 días**
5. Puedes **reintentar** o **eliminar** manualmente

### Configuración

Variable de entorno en workers:

```bash
# En .env
MAX_JOB_ATTEMPTS=3  # Número de intentos antes de DLQ
```

### API Endpoints

#### 1. Ver Jobs en DLQ

```bash
# Todos los canales
curl -H "X-API-Key: your-key" \
  http://localhost:3000/api/v1/dlq

# Solo un canal específico
curl -H "X-API-Key: your-key" \
  "http://localhost:3000/api/v1/dlq?channel=discord&limit=10"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "12345",
        "data": {
          "notificationId": 789,
          "type": "error",
          "title": "Deployment Failed",
          "message": "Build timeout"
        },
        "error": "Webhook returned 404",
        "attempts": 3,
        "failedAt": "2024-11-09T19:45:00.000Z",
        "originalQueue": "discord-notifications",
        "channel": "discord"
      }
    ],
    "counts": {
      "total": 5,
      "byChannel": {
        "webpush": 0,
        "discord": 3,
        "slack": 2,
        "email": 0
      }
    },
    "total": 5
  }
}
```

#### 2. Conteo de Jobs en DLQ

```bash
curl -H "X-API-Key: your-key" \
  http://localhost:3000/api/v1/dlq/count
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "total": 5,
    "byChannel": {
      "webpush": 0,
      "discord": 3,
      "slack": 2,
      "email": 0
    }
  }
}
```

#### 3. Reintentar un Job

```bash
curl -X POST \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"channel": "discord"}' \
  http://localhost:3000/api/v1/dlq/retry/12345
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Job retried successfully",
  "data": {
    "originalJobId": "12345",
    "newJobId": "67890",
    "channel": "discord"
  }
}
```

#### 4. Limpiar DLQ

```bash
# Limpiar un canal
curl -X DELETE \
  -H "X-API-Key: your-key" \
  "http://localhost:3000/api/v1/dlq?channel=discord"

# Limpiar todos los canales
curl -X DELETE \
  -H "X-API-Key: your-key" \
  "http://localhost:3000/api/v1/dlq?channel=all"
```

### Monitoreo en Logs

Los workers registran cuando un job se mueve a DLQ:

```json
{
  "level": "warn",
  "message": "Job moved to DLQ",
  "jobId": "12345",
  "attempts": 3,
  "error": "Webhook returned 404",
  "timestamp": "2024-11-09T19:45:00.000Z"
}
```

### Redis Keys

DLQ usa listas de Redis:

```bash
# Ver DLQ de un canal
redis-cli LRANGE "webpush-notifications:dlq" 0 -1
redis-cli LRANGE "discord-notifications:dlq" 0 -1
redis-cli LRANGE "slack-notifications:dlq" 0 -1
redis-cli LRANGE "email-notifications:dlq" 0 -1

# Conteo de items en DLQ
redis-cli LLEN "discord-notifications:dlq"
```

### Backoff Strategy

Reintentos con **exponential backoff**:

| Intento | Delay | Tiempo Acumulado |
|---------|-------|------------------|
| 1 | 0s | 0s |
| 2 | 10s | 10s |
| 3 | 30s | 40s |
| 4 (→DLQ) | - | - |

Fórmula: `min(10000 * 3^(attempt - 1), 300000)` ms

### Casos de Uso

1. **Webhook temporal caído**: Reintenta después de arreglar
2. **Endpoint inválido**: Revisa el job, arregla config, reintenta
3. **Rate limit externo**: Espera y reintenta más tarde
4. **Debugging**: Analiza por qué fallan ciertas notificaciones
5. **Auditoría**: Mantén registro de fallas por 7 días

### Alertas Prometheus

Puedes crear alertas cuando el DLQ crece demasiado:

```yaml
# prometheus-alerts.yml
groups:
  - name: dlq_alerts
    rules:
      - alert: DLQGrowing
        expr: redis_list_length{key=~".*:dlq"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DLQ has {{ $value }} items"
```

### Beneficios

- ✅ **No pierdes notificaciones**: Se guardan para revisar
- ✅ **Debugging fácil**: Ves exactamente qué falló y por qué
- ✅ **Retry manual**: Reintentas cuando arreglas el problema
- ✅ **TTL automático**: Se limpia después de 7 días
- ✅ **Per-channel**: Gestiona cada canal independientemente

---

## 🎯 Combinando Todo

Ejemplo de uso completo:

```bash
# 1. Iniciar solo los workers que necesitas
./scripts/start.sh

# 2. Crear API key con tier pro
psql -U notifier -d notifications -c "
  INSERT INTO api_keys (key, name, project, tier, active)
  VALUES ('prod-key-123', 'Production', 'my-app', 'pro', true);
"

# 3. Enviar notificación
curl -X POST http://localhost:3000/api/v1/notify \
  -H "X-API-Key: prod-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "success",
    "title": "Deployment",
    "message": "v2.0 deployed"
  }'

# 4. Monitorear rate limits
curl -H "X-API-Key: prod-key-123" \
  http://localhost:3000/api/v1/stats

# 5. Revisar DLQ si hay fallas
curl -H "X-API-Key: prod-key-123" \
  http://localhost:3000/api/v1/dlq/count

# 6. Ver Grafana para métricas visuales
open http://localhost:3001
```

---

## 📊 Comparación: Antes vs Después

| Feature | Antes | Después |
|---------|-------|---------|
| Workers | Todos siempre activos | Solo los configurados |
| Rate Limit | Global (100 req/min) | Por tier (100-2000 req/min) |
| Jobs fallidos | Se pierden | Se guardan en DLQ |
| Memoria | ~800MB | ~400-600MB (depende de workers) |
| Reintentos | 3 veces con delay fijo | 3 veces con exponential backoff |
| Gestión | Manual | APIs + Dashboard |

---

## 🔗 Ver También

- [Log Rotation](./LOG_ROTATION.md) - Gestión de logs
- [README](../README.md) - Documentación principal
- [API Documentation](../api/README.md) - Referencia de API completa
