# Guía de Operaciones - ZO Notifications

Guía completa de operaciones, mantenimiento y monitoreo del sistema ZO Notifications.

## 📋 Tabla de Contenidos

- [Alertas de Prometheus](#alertas-de-prometheus)
- [Mantenimiento Automático](#mantenimiento-automático)
- [Backups](#backups)
- [Métricas Personalizadas](#métricas-personalizadas)
- [Troubleshooting](#troubleshooting)

---

## 🚨 Alertas de Prometheus

### Configuración

Las alertas están definidas en `monitoring/prometheus/alerts.yml` y se evalúan cada 15 segundos.

### Categorías de Alertas

#### 1. Dead Letter Queue (DLQ)

| Alerta | Severidad | Condición | Acción |
|--------|-----------|-----------|---------|
| `DLQGrowing` | warning | DLQ > 10 items por 5min | Revisar jobs fallidos |
| `DLQCritical` | critical | DLQ > 100 items por 10min | Investigar urgentemente |
| `DLQGrowthRate` | warning | Crecimiento > 0.5 items/seg | Verificar workers |

**Ejemplo de investigación:**

```bash
# Ver jobs en DLQ
curl -H "X-API-Key: your-key" http://localhost:3000/api/v1/dlq

# Ver por canal específico
curl -H "X-API-Key: your-key" \
  "http://localhost:3000/api/v1/dlq?channel=discord&limit=20"

# Revisar logs del worker
docker logs zo_discord_worker --tail 100

# Reintentar un job
curl -X POST -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"channel":"discord"}' \
  http://localhost:3000/api/v1/dlq/retry/<jobId>
```

#### 2. Queues

| Alerta | Severidad | Condición | Acción |
|--------|-----------|-----------|---------|
| `QueueBacklog` | warning | > 100 jobs esperando | Escalar workers |
| `QueueSaturated` | warning | > 50 jobs activos | Revisar performance |
| `HighFailureRate` | critical | > 1 falla/seg | Verificar integraciones |

**Acciones:**

```bash
# Ver estado de queues
curl -H "X-API-Key: your-key" http://localhost:3000/api/v1/stats

# Ver métricas en Prometheus
open http://localhost:9090/graph?g0.expr=queue_depth

# Reiniciar worker si está colgado
docker restart zo_webpush_worker
```

#### 3. Rate Limiting

| Alerta | Severidad | Condición | Acción |
|--------|-----------|-----------|---------|
| `RateLimitNearLimit` | warning | Uso > 80% | Notificar al proyecto |
| `RateLimitExceeded` | warning | > 0.1 bloqueos/seg | Revisar tier |

**Acciones:**

```bash
# Ver uso de rate limits
docker exec zo_postgres psql -U notifier -d notifications -c "
  SELECT * FROM rate_limit_stats;
"

# Aumentar tier de un proyecto
docker exec zo_postgres psql -U notifier -d notifications -c "
  UPDATE api_keys 
  SET tier = 'pro', rate_limit_max = 2000
  WHERE key = 'project-key';
"
```

#### 4. Workers

| Alerta | Severidad | Condición | Acción |
|--------|-----------|-----------|---------|
| `WorkerDown` | critical | Worker no responde | Reiniciar container |
| `WorkerHighMemory` | warning | Memoria > 90% | Investigar memory leak |
| `WorkerHighCPU` | warning | CPU > 80% por 10min | Revisar carga |

**Acciones:**

```bash
# Ver salud de workers
curl http://localhost:3001/health  # WebPush
curl http://localhost:3002/health  # Discord
curl http://localhost:3003/health  # Slack
curl http://localhost:3004/health  # Email

# Ver uso de recursos
docker stats zo_webpush_worker

# Reiniciar worker
docker restart zo_webpush_worker
```

#### 5. Base de Datos

| Alerta | Severidad | Condición | Acción |
|--------|-----------|-----------|---------|
| `PostgreSQLDown` | critical | DB no responde | Verificar container |
| `PostgreSQLTooManyConnections` | warning | > 80 conexiones | Revisar leaks |
| `RedisDown` | critical | Redis no responde | Reiniciar Redis |
| `RedisHighMemory` | warning | Memoria > 90% | Revisar TTL |

**Acciones:**

```bash
# Verificar PostgreSQL
docker exec zo_postgres pg_isready -U notifier

# Ver conexiones activas
docker exec zo_postgres psql -U notifier -d notifications -c "
  SELECT count(*) FROM pg_stat_activity;
"

# Verificar Redis
docker exec zo_redis redis-cli -a "${REDIS_PASSWORD}" --no-auth-warning ping

# Ver uso de memoria Redis
docker exec zo_redis redis-cli -a "${REDIS_PASSWORD}" --no-auth-warning info memory
```

#### 6. Sistema

| Alerta | Severidad | Condición | Acción |
|--------|-----------|-----------|---------|
| `DiskSpaceLow` | warning | Disco < 10% libre | Limpiar logs/DLQ |
| `DiskSpaceCritical` | critical | Disco < 5% libre | Acción inmediata |

**Acciones:**

```bash
# Ver uso de disco
df -h

# Limpiar logs antiguos
find ./logs -name "*.log" -type f -mtime +7 -delete

# Limpiar DLQ
curl -X DELETE -H "X-API-Key: your-key" \
  "http://localhost:3000/api/v1/dlq?channel=all"

# Limpiar rate_limit_usage
docker exec zo_postgres psql -U notifier -d notifications -c "
  SELECT cleanup_old_rate_limits();
"
```

---

## ⚙️ Mantenimiento Automático

### Cron Jobs Configurados

Archivo: `scripts/crontab`

#### 1. Limpieza de Rate Limits (cada hora)

```cron
0 * * * * cd /app && /app/scripts/cleanup-rate-limits.sh
```

**Función:** Elimina registros de rate_limit_usage > 24 horas.

**Ejecución manual:**

```bash
./scripts/cleanup-rate-limits.sh
```

#### 2. Backup de DLQ (cada 6 horas)

```cron
0 */6 * * * cd /app && /app/scripts/backup-dlq.sh
```

**Función:** Guarda jobs fallidos en `backups/dlq/` (comprimidos).

**Ejecución manual:**

```bash
./scripts/backup-dlq.sh
```

**Restaurar desde backup:**

```bash
# Ver backups disponibles
ls -lh backups/dlq/

# Descomprimir y ver contenido
zcat backups/dlq/dlq_backup_20241109_120000.json.gz | jq .

# Reintentar jobs desde backup (manualmente)
# 1. Extraer job data del backup
# 2. Usar API /api/v1/notify para reenviar
```

#### 3. Limpieza de Logs (diario a las 3 AM)

```cron
0 3 * * * find /app/logs -name "*.log" -type f -mtime +7 -delete
```

**Función:** Elimina logs > 7 días.

#### 4. Verificación de DLQ (semanal, lunes 2 AM)

```cron
0 2 * * 1 cd /app && /app/scripts/cleanup-old-dlq.sh
```

**Función:** Reporta estado de DLQ para limpieza manual si es necesario.

### Instalación de Cron Jobs

```bash
# En el host (si usas cron del sistema)
crontab -e
# Copiar contenido de scripts/crontab

# Dentro de container (si prefieres)
docker exec -it zo_api sh
crontab /app/scripts/crontab
```

**Nota:** Docker log rotation (ya configurado) evita que logs de containers llenen el disco.

---

## 💾 Backups

### 1. Backup de Base de Datos

```bash
# Backup completo
docker exec zo_postgres pg_dump -U notifier notifications | gzip > backups/db/notifications_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup de solo esquema
docker exec zo_postgres pg_dump -U notifier --schema-only notifications > backups/db/schema.sql

# Backup de solo datos
docker exec zo_postgres pg_dump -U notifier --data-only notifications | gzip > backups/db/data.sql.gz
```

### 2. Backup de Redis (DLQ)

Ya automatizado con `scripts/backup-dlq.sh` cada 6 horas.

### 3. Backup de Configuración

```bash
# Crear backup de configs
tar -czf backups/config/config_$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  docker-compose.prod.yml \
  monitoring/ \
  scripts/

# Excluir logs y datos
tar -czf backups/full_config.tar.gz \
  --exclude='logs' \
  --exclude='node_modules' \
  --exclude='backups' \
  .
```

### 4. Restauración

#### Restaurar Base de Datos:

```bash
# Desde backup
gunzip < backups/db/notifications_20241109.sql.gz | \
  docker exec -i zo_postgres psql -U notifier notifications
```

#### Restaurar Redis:

```bash
# Redis se recupera de DLQ backups mediante API retry
# Ver sección "Backups -> Restaurar desde backup"
```

---

## 📊 Métricas Personalizadas

### Métricas de DLQ

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `dlq_size` | Gauge | Número de jobs en DLQ por canal |
| `dlq_jobs_total` | Counter | Total de jobs movidos a DLQ |
| `dlq_retries_total` | Counter | Total de jobs reintentados |

**Ejemplos de queries Prometheus:**

```promql
# Jobs actuales en DLQ
dlq_size{channel="discord"}

# Rate de jobs fallando
rate(dlq_jobs_total[5m])

# Total de retries exitosos
dlq_retries_total{status="success"}
```

### Métricas de Rate Limiting

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `rate_limit_usage` | Gauge | Uso actual por API key |
| `rate_limit_max` | Gauge | Límite máximo por API key |
| `rate_limit_exceeded_total` | Counter | Requests bloqueados (429) |

**Ejemplos de queries Prometheus:**

```promql
# Uso como porcentaje del límite
(rate_limit_usage / rate_limit_max) * 100

# API keys cerca del límite
(rate_limit_usage / rate_limit_max) > 0.8

# Rate de bloqueos por proyecto
rate(rate_limit_exceeded_total{project="my-app"}[5m])
```

### Dashboards de Grafana

Importar dashboards preconfigur ados:

```bash
# 1. Abrir Grafana
open http://localhost:3001

# 2. Ir a Dashboards -> Import
# 3. Buscar o usar queries como:

# Panel: DLQ Size
sum(dlq_size) by (channel)

# Panel: Rate Limit Usage
rate_limit_usage / rate_limit_max * 100

# Panel: Failed Jobs Rate
rate(dlq_jobs_total[5m])
```

---

## 🔧 Troubleshooting

### Problema: DLQ creciendo

**Síntomas:** Alerta `DLQGrowing` o `DLQCritical`.

**Pasos:**

1. Ver jobs fallidos:
```bash
curl -H "X-API-Key: key" http://localhost:3000/api/v1/dlq | jq .
```

2. Identificar patrón:
   - ¿Mismo error en todos?
   - ¿Un canal específico?
   - ¿Desde cuándo?

3. Acciones según causa:
   - **Webhook caído:** Esperar a que vuelva, luego retry
   - **Endpoint inválido:** Actualizar config, retry
   - **Rate limit externo:** Esperar window, retry
   - **Bug en worker:** Fix, rebuild, retry

4. Retry en masa:
```bash
# Obtener IDs de jobs
curl -H "X-API-Key: key" http://localhost:3000/api/v1/dlq | \
  jq -r '.data.jobs[].jobId' | \
  while read id; do
    curl -X POST -H "X-API-Key: key" \
      -H "Content-Type: application/json" \
      -d "{\"channel\":\"discord\"}" \
      "http://localhost:3000/api/v1/dlq/retry/$id"
  done
```

### Problema: Rate limit agotado

**Síntomas:** Alerta `RateLimitNearLimit` o requests 429.

**Pasos:**

1. Ver estadísticas:
```sql
SELECT * FROM rate_limit_stats WHERE project = 'my-app';
```

2. Opciones:
   - **Aumentar tier:**
   ```sql
   UPDATE api_keys SET tier = 'pro' WHERE key = 'my-key';
   ```

   - **Limpiar histórico:**
   ```sql
   SELECT cleanup_old_rate_limits();
   ```

   - **Distribuir carga** en el tiempo

### Problema: Worker caído

**Síntomas:** Alerta `WorkerDown`.

**Pasos:**

1. Ver logs:
```bash
docker logs zo_discord_worker --tail 100
```

2. Verificar health:
```bash
curl http://localhost:3002/health
```

3. Reiniciar:
```bash
docker restart zo_discord_worker
```

4. Si persiste, rebuild:
```bash
docker-compose -f docker-compose.prod.yml up -d --build discord-worker
```

### Problema: Disco lleno

**Síntomas:** Alerta `DiskSpaceLow`.

**Pasos:**

1. Ver uso:
```bash
df -h
du -sh logs/ backups/ data/
```

2. Limpiar:
```bash
# Logs antiguos
find logs/ -name "*.log" -mtime +7 -delete

# DLQ backups antiguos
find backups/dlq/ -name "*.gz" -mtime +30 -delete

# DLQ en Redis
curl -X DELETE -H "X-API-Key: key" \
  "http://localhost:3000/api/v1/dlq?channel=all"

# Rate limit usage
docker exec zo_postgres psql -U notifier -d notifications -c "
  DELETE FROM rate_limit_usage WHERE created_at < NOW() - INTERVAL '1 day';
"
```

---

## 📈 Best Practices

### 1. Monitoreo Proactivo

- Revisar Grafana diariamente
- Configurar webhooks de Prometheus a Slack/Discord
- Mantener DLQ < 10 items
- Revisar rate limits semanalmente

### 2. Mantenimiento Regular

- Backups automáticos funcionando
- Cron jobs activos
- Logs rotando correctamente
- DLQ limpio

### 3. Escalabilidad

- Si queue_depth > 50 constantemente: Escalar workers
- Si rate_limit_exceeded alto: Revisar tiers
- Si DLQ crece: Investigar root cause

### 4. Seguridad

- Rotar API keys mensualmente
- Revisar logs de acceso
- Mantener secrets seguros
- Actualizar dependencies regularmente

---

## 🔗 Referencias

- [Prometheus Query Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [PostgreSQL Maintenance](https://www.postgresql.org/docs/current/maintenance.html)
- [Redis Best Practices](https://redis.io/docs/manual/admin/)

---

**Necesitas ayuda?** Consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) o [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md)
