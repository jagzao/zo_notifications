# Monitoring Stack - ZO Notifications

Guía completa del stack de observabilidad con Prometheus, Grafana, Loki y Uptime Kuma.

## 📊 **Stack de Monitoring**

El sistema incluye un stack completo de observabilidad **100% gratuito y auto-hospedado**:

- **Prometheus** - Recolección y almacenamiento de métricas
- **Grafana** - Visualización y dashboards
- **Loki** - Agregación de logs
- **Promtail** - Recolector de logs para Loki
- **Uptime Kuma** - Monitoring de uptime y disponibilidad
- **Exporters** - PostgreSQL, Redis y Node metrics

Todo con **costo 0** usando solo herramientas open-source.

---

## 🚀 **Inicio Rápido**

### Iniciar Stack Completo

```bash
# Iniciar con monitoring completo
docker-compose -f docker-compose.prod.yml up -d

# Verificar que todos los servicios están corriendo
docker-compose -f docker-compose.prod.yml ps
```

### Acceder a las Interfaces

- **Grafana**: http://localhost:3001
  - Usuario: `admin`
  - Password: `admin` (cambiar en primer login)

- **Prometheus**: http://localhost:9090

- **Uptime Kuma**: http://localhost:3002
  - Crear cuenta en primer acceso

- **Dashboard Principal**: http://localhost:5173

- **API**: http://localhost:3000

---

## 📈 **Prometheus - Métricas**

### Métricas Disponibles

El API expone métricas en `/metrics` (formato Prometheus):

#### HTTP Metrics
- `http_requests_total` - Total de requests por método, ruta y status
- `http_request_duration_seconds` - Duración de requests (histogram)

#### Notification Metrics
- `notifications_total` - Total de notificaciones por tipo y proyecto
- `notification_processing_duration_seconds` - Duración de procesamiento

#### Queue Metrics
- `queue_depth` - Profundidad actual de las queues por estado
- `queue_jobs_processed_total` - Jobs procesados por queue y status

#### WebSocket Metrics
- `websocket_connections_active` - Conexiones WebSocket activas
- `websocket_messages_total` - Mensajes enviados por tipo de evento

#### Database Metrics
- `database_connections_active` - Conexiones activas a PostgreSQL
- `database_query_duration_seconds` - Duración de queries

#### Redis Metrics
- `redis_operations_total` - Operaciones Redis por tipo y status

#### System Metrics (Node.js)
- `process_cpu_user_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memoria RAM
- `nodejs_heap_size_used_bytes` - Heap usage

### Consultas Útiles

```promql
# Rate de notificaciones por minuto
rate(notifications_total[1m])

# Notificaciones por tipo (últimas 5m)
sum(rate(notifications_total[5m])) by (type)

# P95 de response time del API
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)

# Queue depth promedio
avg(queue_depth{state="waiting"}) by (queue_name)

# Conexiones WebSocket
websocket_connections_active

# Error rate
sum(rate(notifications_total{type="error"}[5m])) /
sum(rate(notifications_total[5m]))
```

### Configuración

Editar `monitoring/prometheus/prometheus.yml` para:

- Cambiar intervalo de scrape (default: 15s)
- Añadir nuevos targets
- Configurar alertas
- Ajustar retención (default: 30 días)

---

## 📊 **Grafana - Dashboards**

### Dashboard Principal

El dashboard **ZO Notifications - Overview** incluye:

1. **Stats Generales**
   - Total notificaciones (24h)
   - Errores (24h)
   - Conexiones WebSocket activas
   - Queue depth

2. **Timeline Charts**
   - Notificaciones por tipo (rate/5m)
   - HTTP requests por ruta
   - API response time (p50, p95)
   - Memory usage por servicio

3. **Tablas**
   - Top proyectos por volumen

### Crear Nuevos Dashboards

1. Acceder a Grafana: http://localhost:3001
2. Click en "+" → "Dashboard"
3. Seleccionar datasource "Prometheus"
4. Añadir panels con queries

Ejemplo de panel:
```json
{
  "title": "Notificaciones por Proyecto",
  "targets": [{
    "expr": "sum(notifications_total) by (project)"
  }]
}
```

### Datasources Configurados

- **Prometheus**: Métricas del sistema
- **Loki**: Logs agregados

Configuración en `monitoring/grafana/datasources.yml`.

---

## 📝 **Loki + Promtail - Logs**

### Visualizar Logs en Grafana

1. Ir a **Explore** en Grafana
2. Seleccionar datasource **Loki**
3. Usar LogQL para consultas:

```logql
# Todos los logs del API
{container=~".*api.*"}

# Solo errores
{container=~".*api.*"} |= "error"

# Logs de un proyecto específico
{container=~".*api.*"} | json | project="mi-proyecto"

# Rate de errores
rate({container=~".*api.*"} |= "ERROR" [5m])
```

### Logs Recolectados

Promtail recolecta automáticamente logs de:
- API
- WebPush Worker
- Discord Worker
- PostgreSQL
- Redis

Configuración en `monitoring/loki/promtail-config.yml`.

### Retención

- **Default**: 31 días (744 horas)
- Configurable en `monitoring/loki/loki-config.yml`

---

## ⏱️ **Uptime Kuma - Monitoring de Disponibilidad**

### Setup Inicial

1. Acceder a http://localhost:3002
2. Crear cuenta de administrador (primera vez)
3. Añadir monitores:

#### Monitor para API Health
- **Tipo**: HTTP(s)
- **URL**: http://api:3000/api/v1/health
- **Intervalo**: 60 segundos
- **Timeout**: 10 segundos

#### Monitor para Frontend
- **Tipo**: HTTP(s)
- **URL**: http://frontend:5173
- **Intervalo**: 60 segundos

#### Monitor para WebSocket
- **Tipo**: WebSocket
- **URL**: ws://api:3000/socket.io
- **Intervalo**: 60 segundos

### Notificaciones

Configurar notificaciones en Uptime Kuma cuando servicios fallen:

1. Settings → Notifications
2. Añadir notificación:
   - Discord Webhook
   - Email (SMTP)
   - Slack Webhook
   - Telegram
   - Etc.

### Status Page Pública

Crear página pública de status:

1. Status Page → Create
2. Seleccionar monitores a mostrar
3. Compartir URL pública

---

## 🔧 **Exporters - Métricas Adicionales**

### PostgreSQL Exporter

Métricas de base de datos:
- Conexiones activas
- Tamaño de tablas
- Query performance
- Locks y deadlocks

Acceder a métricas: http://localhost:9187/metrics

### Redis Exporter

Métricas de Redis:
- Memoria usada
- Keys totales
- Hits/Misses
- Connected clients

Acceder a métricas: http://localhost:9121/metrics

### Node Exporter

Métricas del sistema host:
- CPU usage
- Memoria RAM
- Disco
- Network I/O

Acceder a métricas: http://localhost:9100/metrics

---

## 🎯 **Métricas Clave a Monitorear**

### Health Indicators

| Métrica | Normal | Advertencia | Crítico |
|---------|--------|-------------|---------|
| API Response Time (p95) | < 200ms | 200-500ms | > 500ms |
| Queue Depth (waiting) | < 100 | 100-1000 | > 1000 |
| Error Rate | < 1% | 1-5% | > 5% |
| CPU Usage | < 50% | 50-80% | > 80% |
| Memory Usage | < 70% | 70-90% | > 90% |
| Disk Usage | < 80% | 80-90% | > 90% |

### Dashboards Recomendados

1. **Overview Dashboard**
   - Métricas generales del sistema
   - Ya incluido: `zo-notifications-overview`

2. **Application Dashboard**
   - Notificaciones por proyecto
   - Performance por endpoint
   - Queue health

3. **Infrastructure Dashboard**
   - CPU, Memory, Disk
   - Network I/O
   - Database performance

4. **Business Dashboard**
   - Volumen de notificaciones
   - Distribución por tipo
   - Proyectos más activos

---

## 🚨 **Alertas (Opcional)**

### Configurar Alertmanager

1. Descomentar en `monitoring/prometheus/prometheus.yml`:
```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

2. Crear reglas de alertas en `monitoring/prometheus/alerts/rules.yml`:
```yaml
groups:
  - name: zo_notifications
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(notifications_total{type="error"}[5m])) /
          sum(rate(notifications_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: HighQueueDepth
        expr: queue_depth{state="waiting"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Queue depth is high"

      - alert: APIDown
        expr: up{job="api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API is down"
```

3. Añadir servicio Alertmanager a docker-compose.prod.yml

---

## 📊 **Integración con el Sistema**

### Añadir Métricas Personalizadas

En el código del API (`api/src/services/metrics.js`):

```javascript
import { Counter, Histogram } from 'prom-client';

// Crear nueva métrica
export const customMetric = new Counter({
  name: 'custom_metric_total',
  help: 'Description of metric',
  labelNames: ['label1', 'label2']
});

// Usar métrica
customMetric.inc({ label1: 'value1', label2: 'value2' });
```

### Exportar Métricas desde Workers

Los workers también pueden exportar métricas:

1. Instalar `prom-client` en el worker
2. Crear servidor HTTP en puerto específico
3. Exponer `/metrics` endpoint
4. Añadir target en prometheus.yml

---

## 💡 **Tips y Best Practices**

### Performance

- Ajustar `scrape_interval` según necesidad (default: 15s)
- Limitar retención de métricas (default: 30d)
- Usar recording rules para queries pesadas

### Logs

- Usar niveles de log apropiados (debug, info, warn, error)
- Incluir contexto útil en logs JSON
- Rotar logs regularmente

### Dashboards

- Mantener dashboards simples y enfocados
- Usar variables para filtrar por proyecto
- Incluir links a documentación

### Alertas

- Evitar alertas por ruido (ajustar umbrales)
- Usar `for` clause para evitar falsos positivos
- Documentar runbooks para cada alerta

---

## 🔍 **Troubleshooting**

### Prometheus no scraping

```bash
# Ver targets
curl http://localhost:9090/api/v1/targets

# Ver configuración
curl http://localhost:9090/api/v1/status/config
```

### Grafana no muestra datos

1. Verificar datasource: Configuration → Data Sources → Test
2. Revisar queries en panel settings
3. Verificar time range

### Loki no recibe logs

```bash
# Ver logs de Promtail
docker-compose logs promtail

# Verificar que Promtail puede acceder a Docker socket
ls -la /var/run/docker.sock
```

### Uptime Kuma no accesible

```bash
# Verificar logs
docker-compose logs uptime-kuma

# Verificar puerto
netstat -tulpn | grep 3002
```

---

## 📚 **Recursos Adicionales**

### Documentación Oficial

- Prometheus: https://prometheus.io/docs
- Grafana: https://grafana.com/docs
- Loki: https://grafana.com/docs/loki
- Uptime Kuma: https://github.com/louislam/uptime-kuma/wiki

### Dashboards de la Comunidad

- Grafana Dashboards: https://grafana.com/grafana/dashboards
- Node Exporter Full: https://grafana.com/grafana/dashboards/1860
- PostgreSQL: https://grafana.com/grafana/dashboards/9628

### PromQL Resources

- PromQL Tutorial: https://prometheus.io/docs/prometheus/latest/querying/basics
- PromQL Cheat Sheet: https://promlabs.com/promql-cheat-sheet

---

## 🎓 **Próximos Pasos**

1. **Configurar Alertas**
   - Añadir Alertmanager
   - Definir reglas de alertas
   - Configurar notificaciones

2. **Dashboards Personalizados**
   - Crear dashboard por proyecto
   - Añadir métricas de negocio
   - Compartir con equipo

3. **Optimización**
   - Revisar retención de datos
   - Ajustar intervalos de scrape
   - Implementar recording rules

4. **Seguridad**
   - Añadir autenticación a Prometheus
   - Configurar SSL para Grafana
   - Limitar acceso por IP

---

**¡Tu sistema ahora tiene observabilidad completa con costo 0!** 🎉
