# Troubleshooting - ZO Notifications

Guía para resolver problemas comunes.

## 🔍 Diagnóstico General

### Verificar estado de servicios

```bash
# Ver estado de todos los contenedores
docker-compose ps

# Health check del API
curl http://localhost:3000/api/v1/health | jq '.'

# Estadísticas
make stats
```

### Ver logs

```bash
# Todos los servicios
docker-compose logs -f

# Un servicio específico
docker-compose logs -f api
docker-compose logs -f webpush-worker
docker-compose logs -f discord-worker
docker-compose logs -f postgres
docker-compose logs -f redis
```

---

## ❌ **Problemas Comunes**

### 1. API no inicia / Error de conexión

**Síntomas:**
- `curl localhost:3000` no responde
- Error: "Connection refused"
- Contenedor `api` se reinicia constantemente

**Diagnóstico:**
```bash
# Ver logs del API
docker-compose logs api

# Verificar variables de entorno
docker-compose exec api env | grep -E "REDIS|POSTGRES|WEB_PUSH"

# Verificar que Redis y Postgres están corriendo
docker-compose ps redis postgres
```

**Soluciones:**

1. **Redis no conecta:**
   ```bash
   # Verificar password
   docker-compose exec redis redis-cli -a tu-redis-password ping
   # Debe responder: PONG

   # Si falla, revisar REDIS_PASSWORD en .env
   ```

2. **PostgreSQL no conecta:**
   ```bash
   # Verificar conexión
   docker-compose exec postgres pg_isready -U notifier

   # Conectar a la base de datos
   docker-compose exec postgres psql -U notifier -d notifications
   ```

3. **Web Push keys no configuradas:**
   ```bash
   # Generar keys
   make keys

   # Añadir al .env
   WEB_PUSH_PUBLIC_KEY=BCxxx...
   WEB_PUSH_PRIVATE_KEY=xxx...
   ```

4. **Puerto 3000 en uso:**
   ```bash
   # Ver qué usa el puerto
   lsof -i :3000

   # Cambiar puerto en .env
   API_PORT=3001
   ```

---

### 2. Frontend no carga / Pantalla en blanco

**Síntomas:**
- Navegador muestra página en blanco
- Error: "Failed to fetch"
- Console muestra errores de CORS

**Diagnóstico:**
```bash
# Ver logs del frontend
docker-compose logs frontend

# Verificar que API está corriendo
curl http://localhost:3000/api/v1/health
```

**Soluciones:**

1. **Error de CORS:**
   ```bash
   # Verificar ALLOWED_ORIGINS en .env
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

   # Reiniciar API
   docker-compose restart api
   ```

2. **Variables de entorno incorrectas:**
   ```bash
   # Verificar en .env
   VITE_API_URL=http://localhost:3000
   VITE_WS_URL=ws://localhost:3000

   # Rebuild frontend
   docker-compose build frontend
   docker-compose restart frontend
   ```

3. **Puerto 5173 en uso:**
   ```bash
   # Cambiar puerto
   # Editar docker-compose.yml
   ports:
     - "5174:5173"
   ```

---

### 3. No recibo Web Push Notifications

**Síntomas:**
- No aparecen notificaciones del navegador
- Botón "Activar notificaciones" no funciona
- Error en console del navegador

**Diagnóstico:**
```bash
# Verificar logs del worker
docker-compose logs webpush-worker

# Verificar subscriptions en DB
docker-compose exec postgres psql -U notifier -d notifications \
  -c "SELECT COUNT(*) FROM push_subscriptions WHERE active = true;"
```

**Soluciones:**

1. **Permiso denegado en el navegador:**
   - Verificar que diste permiso para notificaciones
   - En Chrome: Settings → Privacy → Site settings → Notifications
   - Borrar y volver a dar permiso

2. **Web Push keys no configuradas:**
   ```bash
   # Ver si están configuradas
   grep WEB_PUSH .env

   # Si no están, generar
   make keys

   # Reiniciar servicios
   docker-compose restart api webpush-worker
   ```

3. **HTTPS requerido en producción:**
   - Web Push requiere HTTPS (excepto localhost)
   - Configurar SSL con Nginx o usar Cloudflare Tunnel

4. **Subscription expirada:**
   ```sql
   -- Limpiar subscriptions expiradas
   DELETE FROM push_subscriptions
   WHERE expiration_time IS NOT NULL
     AND expiration_time < EXTRACT(EPOCH FROM NOW()) * 1000;
   ```

---

### 4. Discord no recibe mensajes

**Síntomas:**
- Errores no aparecen en Discord
- Worker muestra error 404 o 401
- Logs: "Discord API error"

**Diagnóstico:**
```bash
# Ver logs del worker
docker-compose logs discord-worker

# Probar webhook directamente
curl -X POST "TU_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test desde curl"}'
```

**Soluciones:**

1. **Webhook URL incorrecta:**
   ```bash
   # Verificar en .env
   grep DISCORD_WEBHOOK_URL .env

   # Debe ser algo como:
   # https://discord.com/api/webhooks/123456789/ABCD...

   # Crear nuevo webhook si es necesario:
   # Discord → Server Settings → Integrations → Webhooks
   ```

2. **Webhook eliminado:**
   - Verificar en Discord que el webhook existe
   - Crear uno nuevo si fue eliminado
   - Actualizar .env con la nueva URL

3. **Rate limit de Discord:**
   - Discord limita a ~5 mensajes cada 2 segundos
   - El worker ya tiene rate limiting configurado
   - Si envías muchos errores, algunos se encolarán

---

### 5. Base de datos llena / Performance lento

**Síntomas:**
- Queries lentas
- Espacio en disco lleno
- API tarda en responder

**Diagnóstico:**
```bash
# Ver tamaño de la base de datos
docker-compose exec postgres psql -U notifier -d notifications \
  -c "SELECT pg_size_pretty(pg_database_size('notifications'));"

# Contar notificaciones
docker-compose exec postgres psql -U notifier -d notifications \
  -c "SELECT type, COUNT(*) FROM notifications GROUP BY type;"

# Ver espacio en disco
docker system df
```

**Soluciones:**

1. **Limpiar notificaciones antiguas:**
   ```sql
   -- Borrar notificaciones de más de 30 días
   DELETE FROM notifications
   WHERE created_at < NOW() - INTERVAL '30 days';

   -- Vacuum para recuperar espacio
   VACUUM FULL notifications;
   ```

2. **Configurar limpieza automática:**
   ```sql
   -- Crear función de limpieza
   CREATE OR REPLACE FUNCTION cleanup_old_notifications()
   RETURNS void AS $$
   BEGIN
     DELETE FROM notifications
     WHERE created_at < NOW() - INTERVAL '30 days';
   END;
   $$ LANGUAGE plpgsql;

   -- Programar con pg_cron (si está instalado)
   -- O usar cron del sistema con script
   ```

3. **Limpiar Docker:**
   ```bash
   # Limpiar volúmenes no usados
   docker system prune -a --volumes

   # CUIDADO: Esto borra TODOS los datos
   # Hacer backup primero
   ./scripts/backup.sh
   ```

---

### 6. Queue saturada / Workers no procesan

**Síntomas:**
- Notificaciones no se envían
- Queue depth muy alto
- Logs: "Job failed after 3 attempts"

**Diagnóstico:**
```bash
# Ver estado de las queues
docker-compose exec redis redis-cli -a tu-password

# Comandos en redis-cli:
KEYS bull:*
LLEN bull:webpush-notifications:wait
LLEN bull:discord-notifications:wait
LLEN bull:webpush-notifications:failed
```

**Soluciones:**

1. **Workers detenidos:**
   ```bash
   # Verificar que workers están corriendo
   docker-compose ps | grep worker

   # Reiniciar workers
   docker-compose restart webpush-worker discord-worker
   ```

2. **Muchos jobs fallidos:**
   ```bash
   # Limpiar failed jobs en Redis
   docker-compose exec redis redis-cli -a tu-password

   # Dentro de redis-cli:
   DEL bull:webpush-notifications:failed
   DEL bull:discord-notifications:failed
   ```

3. **Aumentar concurrency:**
   ```javascript
   // En workers/*/index.js
   const worker = new Worker('queue-name', processJob, {
     connection,
     concurrency: 10  // Aumentar de 5 a 10
   });
   ```

---

### 7. WebSocket no conecta / No real-time

**Síntomas:**
- Dashboard no actualiza en tiempo real
- Console: "WebSocket connection failed"
- Badge no cuenta correctamente

**Diagnóstico:**
```bash
# Ver logs del API (donde está Socket.io)
docker-compose logs api | grep -i socket

# Probar WebSocket con curl
curl --include \
     --no-buffer \
     --header "Connection: Upgrade" \
     --header "Upgrade: websocket" \
     http://localhost:3000/socket.io/
```

**Soluciones:**

1. **URL incorrecta:**
   ```bash
   # Verificar VITE_WS_URL en .env
   VITE_WS_URL=ws://localhost:3000

   # Rebuild frontend
   docker-compose build frontend
   ```

2. **CORS para WebSocket:**
   ```javascript
   // En api/src/index.js
   const io = new Server(httpServer, {
     cors: {
       origin: config.allowedOrigins,
       methods: ['GET', 'POST']
     }
   });
   ```

3. **Nginx bloqueando WebSocket:**
   ```nginx
   # En nginx.conf
   location /socket.io {
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     # ... resto de configuración
   }
   ```

---

## 🔧 **Comandos Útiles**

### Resetear todo (desarrollo)

```bash
# ⚠️  CUIDADO: Esto borra TODOS los datos

# 1. Detener servicios
docker-compose down

# 2. Eliminar volúmenes
docker-compose down -v

# 3. Limpiar imágenes
docker system prune -a

# 4. Volver a iniciar
make start
```

### Ver uso de recursos

```bash
# Stats de Docker
docker stats

# Uso de memoria por contenedor
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Espacio en disco
du -sh /var/lib/docker
```

### Backup y restore

```bash
# Crear backup
./scripts/backup.sh

# Listar backups
ls -lh backups/

# Restaurar backup
./scripts/restore.sh backups/zo_notifications_20251113_120000.sql.gz
```

---

## 📊 **Métricas de Salud**

### Indicadores normales

- **Health check**: `status: "healthy"`
- **Queue depth**: < 100
- **CPU usage**: < 50%
- **Memory usage**: < 80%
- **Disk usage**: < 80%
- **API response time**: < 200ms

### Indicadores de problema

- ⚠️  Queue depth > 1000
- ⚠️  CPU > 80% sostenido
- ⚠️  Memory > 90%
- ⚠️  Disk > 90%
- ⚠️  API response > 1s
- ⚠️  Workers reiniciando constantemente

---

## 🆘 **Último Recurso**

Si nada funciona:

```bash
# 1. Hacer backup de datos
./scripts/backup.sh

# 2. Guardar .env
cp .env .env.backup

# 3. Resetear completamente
docker-compose down -v
docker system prune -a -f

# 4. Volver a clonar/rebuild
git pull
docker-compose build --no-cache
docker-compose up -d

# 5. Restaurar datos
./scripts/restore.sh backups/latest.sql.gz
```

---

## 📞 **Obtener Ayuda**

Si el problema persiste:

1. Revisa los logs completos: `docker-compose logs > logs.txt`
2. Exporta tu configuración (sin secrets): `env | grep -v PASSWORD`
3. Verifica versiones: `docker --version && docker-compose --version`
4. Abre un issue en GitHub con toda la información anterior

---

**Tip**: Mantén siempre backups actualizados con `./scripts/backup.sh`
