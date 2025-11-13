# Log Rotation - ZO Notifications

## 📝 **Configuración de Log Rotation**

Para evitar que los logs llenen el disco, todos los servicios tienen configurado **log rotation automático**.

### **Configuración en Docker Compose**

Cada servicio tiene esta configuración:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"   # Máximo 10MB por archivo
    max-file: "3"      # Mantener 3 archivos (30MB total)
```

### **Límites por Servicio**

| Servicio | Max Size | Max Files | Total |
|----------|----------|-----------|-------|
| API | 10MB | 3 | 30MB |
| Workers (cada uno) | 10MB | 3 | 30MB |
| PostgreSQL | 10MB | 3 | 30MB |
| Redis | 10MB | 3 | 30MB |
| Prometheus | 10MB | 3 | 30MB |
| Grafana | 10MB | 3 | 30MB |
| Loki | 10MB | 3 | 30MB |

**Total máximo de logs: ~240MB** (8 servicios × 30MB)

---

## 🔍 **Ver Logs**

### Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose logs -f

# Un servicio específico
docker-compose logs -f api
docker-compose logs -f webpush-worker

# Últimas 100 líneas
docker-compose logs --tail=100 api
```

### Logs en Loki (Producción)

```bash
# Acceder a Grafana
open http://localhost:3001

# Ir a Explore → Loki
# Query de ejemplo:
{container=~".*api.*"} |= "error"
```

---

## 🗑️ **Limpiar Logs Manualmente**

### Limpiar logs de Docker

```bash
# Limpiar todos los logs de Docker
docker-compose down
sudo sh -c "truncate -s 0 /var/lib/docker/containers/*/*-json.log"
docker-compose up -d
```

### Limpiar logs de archivos

```bash
# API logs
rm -f api/logs/*.log

# Workers logs
rm -f workers/*/logs/*.log

# Backups logs
rm -f scripts/logs/*.log
```

---

## ⚙️ **Cambiar Configuración**

### Aumentar límites

Si necesitas más espacio para logs:

```yaml
# En docker-compose.prod.yml
logging:
  driver: "json-file"
  options:
    max-size: "50m"   # 50MB por archivo
    max-file: "5"      # 5 archivos = 250MB total
```

### Enviar logs a syslog

```yaml
logging:
  driver: "syslog"
  options:
    syslog-address: "tcp://localhost:514"
    tag: "{{.Name}}"
```

### Desactivar logs (NO RECOMENDADO)

```yaml
logging:
  driver: "none"
```

---

## 📊 **Monitoreo de Espacio en Disco**

### Ver uso de disco por Docker

```bash
# Espacio usado por contenedores
docker system df

# Detalles completos
docker system df -v

# Limpiar todo lo no usado
docker system prune -a
```

### Ver logs más grandes

```bash
# Encontrar logs más pesados
sudo du -sh /var/lib/docker/containers/*

# Ver tamaño total de logs
sudo du -sh /var/lib/docker/containers
```

---

## 🔄 **Rotación Automática en Producción**

### Logrotate (Linux)

Crear `/etc/logrotate.d/zo-notifications`:

```
/home/user/zo_notifications/*/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 user user
    sharedscripts
    postrotate
        docker-compose -f /home/user/zo_notifications/docker-compose.prod.yml restart > /dev/null 2>&1 || true
    endscript
}
```

Verificar configuración:

```bash
logrotate -d /etc/logrotate.d/zo-notifications
```

---

## 📈 **Best Practices**

1. ✅ **Usar niveles de log apropiados**
   - `ERROR` para errores críticos
   - `WARN` para advertencias
   - `INFO` para información general
   - `DEBUG` solo en desarrollo

2. ✅ **Logs estructurados (JSON)**
   - Facilita búsqueda y análisis
   - Winston ya lo hace automáticamente

3. ✅ **No logear información sensible**
   - No passwords
   - No tokens
   - No PII (Personally Identifiable Information)

4. ✅ **Usar Loki para búsquedas**
   - En lugar de grep en archivos
   - Queries más rápidas y eficientes

5. ✅ **Monitorear espacio en disco**
   - Alertas cuando disco > 80%
   - Limpieza automática si > 90%

---

## 🚨 **Troubleshooting**

### Logs no rotan

```bash
# Verificar configuración
docker inspect api | grep -A 10 LogConfig

# Forzar recreación del contenedor
docker-compose up -d --force-recreate api
```

### Disco lleno

```bash
# Limpiar logs inmediatamente
docker-compose down
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
docker-compose up -d

# Limpiar imágenes viejas
docker image prune -a

# Limpiar volúmenes no usados
docker volume prune
```

### Ver logs después de rotación

```bash
# Los archivos rotados están comprimidos
gunzip -c /var/log/app.log.1.gz | less
```

---

## 📚 **Referencias**

- [Docker Logging Drivers](https://docs.docker.com/config/containers/logging/configure/)
- [JSON File Logging Driver](https://docs.docker.com/config/containers/logging/json-file/)
- [Logrotate Manual](https://linux.die.net/man/8/logrotate)
- [Loki Documentation](https://grafana.com/docs/loki/)

---

**Logs bien gestionados = Sistema sano** 📊
