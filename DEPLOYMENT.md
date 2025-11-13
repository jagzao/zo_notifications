# Guía de Despliegue - ZO Notifications 🚀

Esta guía te ayudará a desplegar el sistema completo de notificaciones.

## 📋 Prerrequisitos

- Docker y Docker Compose instalados
- Node.js 18+ (para generar Web Push keys)
- Cuenta de Discord (para crear webhook)

## 🔧 Configuración Inicial

### 1. Generar Keys de Web Push

```bash
# Instalar web-push globalmente
npm install -g web-push

# Generar las VAPID keys
web-push generate-vapid-keys
```

Esto te dará algo como:
```
Public Key: BCxxxxxxxxxxxx...
Private Key: xxxxxxxxxxxx...
```

### 2. Crear Webhook de Discord

1. Abre Discord y ve al servidor donde quieres recibir errores
2. Click derecho en el canal → **Edit Channel**
3. **Integrations** → **Webhooks** → **New Webhook**
4. Copia la **Webhook URL**

### 3. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus valores
nano .env
```

**Variables OBLIGATORIAS a configurar:**

```env
# Seguridad
API_KEY_SECRET=tu-secreto-muy-seguro-y-aleatorio

# Passwords
REDIS_PASSWORD=un-password-seguro-para-redis
POSTGRES_PASSWORD=un-password-seguro-para-postgres

# Web Push (copiar las keys generadas)
WEB_PUSH_PUBLIC_KEY=BCxxxxxxxxxxxx...
WEB_PUSH_PRIVATE_KEY=xxxxxxxxxxxx...
WEB_PUSH_EMAIL=tu-email@example.com

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456/tu-token
```

## 🚀 Arrancar el Sistema

### Opción 1: Levantar todo con Docker Compose (Recomendado)

```bash
# Construir e iniciar todos los servicios
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Verificar que todo está corriendo
docker-compose ps
```

Deberías ver estos servicios running:
- `zo_notifications_api` (API REST + WebSocket)
- `zo_frontend` (Dashboard React)
- `zo_webpush_worker` (Worker de notificaciones push)
- `zo_discord_worker` (Worker de Discord)
- `zo_redis` (Queue system)
- `zo_postgres` (Database)

### Opción 2: Desarrollo Local (Sin Docker)

**Terminal 1 - PostgreSQL:**
```bash
docker-compose up postgres -d
```

**Terminal 2 - Redis:**
```bash
docker-compose up redis -d
```

**Terminal 3 - API:**
```bash
cd api
npm install
npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 5 - Web Push Worker:**
```bash
cd workers/webpush-worker
npm install
npm start
```

**Terminal 6 - Discord Worker:**
```bash
cd workers/discord-worker
npm install
npm start
```

## ✅ Verificación

### 1. Health Check del API

```bash
curl http://localhost:3000/api/v1/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "checks": {
    "redis": {"status": "ok"},
    "postgres": {"status": "ok"},
    "queue": {"status": "ok"}
  }
}
```

### 2. Abrir el Dashboard

Abre tu navegador en:
```
http://localhost:5173
```

### 3. Activar Notificaciones Push

1. En el dashboard, haz click en **"Activar notificaciones"**
2. Tu navegador pedirá permiso → **Permitir**
3. Deberías ver: "✅ Notificaciones activas"

## 📤 Enviar Tu Primera Notificación

### Notificación de Éxito

```bash
curl -X POST http://localhost:3000/api/v1/notify/success \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-change-this-in-production" \
  -d '{
    "project": "mi-app",
    "title": "Deploy exitoso!",
    "message": "La aplicación se desplegó correctamente",
    "metadata": {
      "version": "1.0.0",
      "environment": "production"
    }
  }'
```

**Resultado esperado:**
- ✅ Push notification en tu navegador
- ✅ Aparece en el dashboard en tiempo real

### Notificación de Error

```bash
curl -X POST http://localhost:3000/api/v1/notify/error \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-change-this-in-production" \
  -d '{
    "project": "mi-api",
    "title": "Error en producción",
    "error": {
      "message": "Database connection timeout",
      "stack": "Error: Connection timeout\n  at Database.connect (db.js:45)",
      "severity": "high"
    },
    "context": {
      "endpoint": "/api/users",
      "method": "GET"
    }
  }'
```

**Resultado esperado:**
- ❌ Mensaje detallado en Discord
- ❌ Push notification (si severity es high/critical)
- ❌ Aparece en el dashboard

## 🔍 Debugging

### Ver logs de un servicio específico

```bash
# API
docker-compose logs -f api

# Frontend
docker-compose logs -f frontend

# Workers
docker-compose logs -f webpush-worker
docker-compose logs -f discord-worker

# Database
docker-compose logs -f postgres

# Redis
docker-compose logs -f redis
```

### Acceder a la base de datos

```bash
docker-compose exec postgres psql -U notifier -d notifications

# Ver notificaciones
SELECT id, type, project, title, created_at FROM notifications ORDER BY created_at DESC LIMIT 10;

# Ver subscriptions
SELECT * FROM push_subscriptions WHERE active = true;

# Ver deliveries
SELECT * FROM notification_deliveries ORDER BY created_at DESC LIMIT 10;
```

### Acceder a Redis CLI

```bash
docker-compose exec redis redis-cli -a tu-redis-password

# Ver keys
KEYS *

# Ver queue
LLEN bull:webpush-notifications:wait
LLEN bull:discord-notifications:wait
```

## 🛑 Detener el Sistema

```bash
# Detener todos los servicios
docker-compose down

# Detener Y eliminar volúmenes (⚠️ borra la base de datos)
docker-compose down -v

# Solo detener sin eliminar
docker-compose stop
```

## 🔄 Actualizar el Sistema

```bash
# Pull últimos cambios
git pull

# Rebuild y restart
docker-compose down
docker-compose up -d --build
```

## 📊 Endpoints Disponibles

### API REST (puerto 3000)

- `GET /api/v1/health` - Health check
- `POST /api/v1/notify/success` - Enviar notificación de éxito
- `POST /api/v1/notify/error` - Enviar notificación de error
- `POST /api/v1/notify/warning` - Enviar notificación de advertencia
- `POST /api/v1/notify/info` - Enviar notificación informativa
- `GET /api/v1/stats` - Estadísticas
- `GET /api/v1/webpush/public-key` - Obtener clave pública Web Push
- `POST /api/v1/webpush/subscribe` - Suscribirse a notificaciones
- `POST /api/v1/webpush/test` - Enviar notificación de prueba

### Frontend (puerto 5173)

- `http://localhost:5173` - Dashboard principal

### WebSocket (puerto 3000)

- `ws://localhost:3000` - Real-time notifications

## 🐛 Problemas Comunes

### El API no arranca

```bash
# Verificar logs
docker-compose logs api

# Verificar que Redis y Postgres están corriendo
docker-compose ps redis postgres

# Reintentar
docker-compose restart api
```

### Frontend no conecta al API

1. Verifica que el API esté corriendo en puerto 3000
2. Verifica las variables de entorno en `.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   VITE_WS_URL=ws://localhost:3000
   ```
3. Reinicia el frontend:
   ```bash
   docker-compose restart frontend
   ```

### No recibo push notifications

1. Verifica que diste permiso en el navegador
2. Verifica que las Web Push keys estén configuradas en `.env`
3. Revisa los logs del webpush-worker:
   ```bash
   docker-compose logs webpush-worker
   ```

### Discord no recibe mensajes

1. Verifica que el webhook URL sea correcto
2. Prueba el webhook directamente:
   ```bash
   curl -X POST "tu-webhook-url" \
     -H "Content-Type: application/json" \
     -d '{"content":"Test desde curl"}'
   ```
3. Revisa los logs del discord-worker:
   ```bash
   docker-compose logs discord-worker
   ```

## 📖 Documentación Adicional

- [README.md](./README.md) - Overview del proyecto
- [PLAN_WEB.md](./docs/PLAN_WEB.md) - Arquitectura web completa
- [API.md](./docs/API.md) - Documentación de la API
- [QUICK_START.md](./docs/QUICK_START.md) - Guía rápida

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica health check: `curl http://localhost:3000/api/v1/health`
3. Consulta la documentación completa
4. Abre un issue en el repositorio

---

**¡Tu sistema de notificaciones está listo para usar!** 🎉
