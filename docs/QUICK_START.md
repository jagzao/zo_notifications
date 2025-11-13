# Quick Start Guide - ZO Notifications 🚀

Esta guía te llevará desde cero hasta tener el sistema funcionando en menos de 10 minutos.

## ⚡ Setup Rápido (5 minutos)

### 1. Prerequisitos

```bash
# Verificar que tienes Docker instalado
docker --version
docker-compose --version

# Si no los tienes, instalar Docker:
# Ubuntu/Debian:
curl -fsSL https://get.docker.com | sh

# macOS:
# Descargar Docker Desktop desde docker.com
```

### 2. Configuración Inicial

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Editar configuración mínima
nano .env

# Cambia estos valores MÍNIMOS:
# - API_KEY_SECRET (cualquier string aleatorio largo)
# - REDIS_PASSWORD (cualquier password seguro)
# - POSTGRES_PASSWORD (cualquier password seguro)
# - NTFY_TOPIC (un nombre único y secreto, ej: zo-notif-tu-nombre-123)
```

### 3. Configurar Discord (2 minutos)

1. Abre Discord y ve al servidor donde quieres recibir notificaciones
2. Click derecho en el canal → "Edit Channel"
3. Integrations → Webhooks → "New Webhook"
4. Copia la Webhook URL
5. Pégala en `.env`:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456/tu-token
   ```

### 4. Configurar Push Notifications (2 minutos)

**En tu celular:**

1. Instala Ntfy:
   - [Android - Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
   - [iOS - App Store](https://apps.apple.com/app/ntfy/id1625396347)

2. Abre la app y suscríbete al topic que configuraste en `.env`
   - Ejemplo: si pusiste `NTFY_TOPIC=zo-notif-juan-123`
   - En la app, subscribe al topic: `zo-notif-juan-123`

3. ¡Listo! Ya recibirás las notificaciones

### 5. Levantar el Sistema

```bash
# Construir e iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Verificar que todo está corriendo
docker-compose ps
```

Deberías ver todos los servicios "Up":
```
NAME                   STATUS
zo_notifications_api   Up (healthy)
zo_push_worker         Up
zo_discord_worker      Up
zo_redis              Up (healthy)
zo_postgres           Up (healthy)
```

## ✅ Verificación

### 1. Health Check

```bash
curl http://localhost:3000/api/v1/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "checks": {
    "redis": "ok",
    "postgres": "ok"
  }
}
```

### 2. Primera Notificación de Prueba

#### Obtener tu API Key

Por ahora, vamos a generar una temporal:

```bash
# Genera un API key simple (en producción usarás uno más robusto)
export API_KEY="test-key-$(date +%s)"
echo "Tu API key temporal: $API_KEY"
```

#### Enviar Notificación de Éxito

```bash
curl -X POST http://localhost:3000/api/v1/notify/success \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "project": "test",
    "title": "Primera notificación",
    "message": "El sistema está funcionando correctamente! 🎉"
  }'
```

**¡Deberías recibir una push notification en tu celular!**

#### Enviar Notificación de Error

```bash
curl -X POST http://localhost:3000/api/v1/notify/error \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "project": "test",
    "title": "Error de prueba",
    "error": {
      "message": "Esto es una prueba de error",
      "stack": "Error: Test error\n  at testFunction (test.js:10:5)",
      "severity": "medium"
    },
    "context": {
      "endpoint": "/api/test",
      "method": "POST"
    }
  }'
```

**¡Deberías ver un mensaje rico en Discord con los detalles del error!**

## 🎯 Casos de Uso Comunes

### Desde un Script Bash

```bash
#!/bin/bash

API_KEY="tu-api-key"
API_URL="http://localhost:3000/api/v1"

# Función helper
notify_success() {
  curl -s -X POST "$API_URL/notify/success" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"project\":\"$1\",\"title\":\"$2\",\"message\":\"$3\"}"
}

notify_error() {
  curl -s -X POST "$API_URL/notify/error" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"project\":\"$1\",\"title\":\"$2\",\"error\":{\"message\":\"$3\"}}"
}

# Uso
if ./deploy.sh; then
  notify_success "mi-app" "Deploy exitoso" "La aplicación se desplegó correctamente"
else
  notify_error "mi-app" "Error en deploy" "Falló el proceso de deploy"
fi
```

### Desde Python

```python
import requests
import json

API_KEY = "tu-api-key"
API_URL = "http://localhost:3000/api/v1"

def notify_success(project, title, message):
    response = requests.post(
        f"{API_URL}/notify/success",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        },
        json={
            "project": project,
            "title": title,
            "message": message
        }
    )
    return response.json()

def notify_error(project, title, error_msg, stack=None):
    response = requests.post(
        f"{API_URL}/notify/error",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        },
        json={
            "project": project,
            "title": title,
            "error": {
                "message": error_msg,
                "stack": stack,
                "severity": "high"
            }
        }
    )
    return response.json()

# Uso
try:
    result = some_process()
    notify_success("data-pipeline", "ETL completado", f"Procesados {result} registros")
except Exception as e:
    notify_error("data-pipeline", "Error en ETL", str(e), traceback.format_exc())
```

### Desde Node.js/JavaScript

```javascript
const axios = require('axios');

const API_KEY = 'tu-api-key';
const API_URL = 'http://localhost:3000/api/v1';

async function notifySuccess(project, title, message) {
  return await axios.post(`${API_URL}/notify/success`, {
    project,
    title,
    message
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  });
}

async function notifyError(project, title, error) {
  return await axios.post(`${API_URL}/notify/error`, {
    project,
    title,
    error: {
      message: error.message,
      stack: error.stack,
      severity: 'high'
    }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  });
}

// Uso con async/await
try {
  await myAsyncFunction();
  await notifySuccess('mi-app', 'Proceso completado', 'Todo OK');
} catch (error) {
  await notifyError('mi-app', 'Error en proceso', error);
}
```

## 🔧 Troubleshooting

### El API no responde

```bash
# Ver logs del API
docker-compose logs api

# Verificar que el contenedor está corriendo
docker-compose ps api

# Reiniciar el API
docker-compose restart api
```

### No recibo push notifications

1. Verifica que el topic en `.env` coincide con el que suscribiste en la app
2. Verifica que `NTFY_SERVER` esté correcto (default: `https://ntfy.sh`)
3. Revisa los logs del worker:
   ```bash
   docker-compose logs push-worker
   ```

### No recibo mensajes en Discord

1. Verifica que el webhook URL sea correcto
2. Prueba el webhook directamente:
   ```bash
   curl -X POST "$DISCORD_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content":"Test desde curl"}'
   ```
3. Revisa los logs:
   ```bash
   docker-compose logs discord-worker
   ```

### Base de datos no conecta

```bash
# Ver logs de postgres
docker-compose logs postgres

# Entrar al contenedor y verificar
docker-compose exec postgres psql -U notifier -d notifications
```

## 📊 Monitoreo Básico

### Ver estadísticas de uso

```bash
curl http://localhost:3000/api/v1/stats \
  -H "X-API-Key: $API_KEY"
```

### Ver logs en tiempo real

```bash
# Todos los servicios
docker-compose logs -f

# Solo un servicio específico
docker-compose logs -f api
docker-compose logs -f push-worker
docker-compose logs -f discord-worker
```

### Ver estado de la queue

```bash
# Conectar a Redis
docker-compose exec redis redis-cli -a tu-redis-password

# Ver keys de las queues
KEYS bull:*

# Ver tamaño de una queue
LLEN bull:notifications:wait
```

## 🛑 Detener el Sistema

```bash
# Detener todos los servicios
docker-compose down

# Detener Y eliminar volúmenes (cuidado: borra la DB)
docker-compose down -v

# Solo detener sin eliminar
docker-compose stop

# Reiniciar todo
docker-compose restart
```

## ⬆️ Actualizar el Sistema

```bash
# Pull últimos cambios
git pull

# Rebuild y restart
docker-compose down
docker-compose build
docker-compose up -d
```

## 🌐 Exponer al Internet (opcional)

### Opción 1: Nginx + SSL (Recomendado)

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones completas.

### Opción 2: Cloudflare Tunnel (Gratis)

```bash
# Instalar cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Autenticar
cloudflared tunnel login

# Crear tunnel
cloudflared tunnel create zo-notifications

# Rutear
cloudflared tunnel route dns zo-notifications notifications.tu-dominio.com

# Configurar y correr
cloudflared tunnel --config config.yml run zo-notifications
```

### Opción 3: ngrok (Desarrollo rápido)

```bash
# Instalar ngrok
snap install ngrok

# Exponer puerto
ngrok http 3000
```

## 📚 Siguientes Pasos

1. Lee la [documentación completa del API](./API.md)
2. Configura [seguridad adicional](./DEPLOYMENT.md#security)
3. Implementa [monitoreo avanzado](./MONITORING.md)
4. Personaliza los [templates de mensajes](./CUSTOMIZATION.md)

## 💬 Ayuda

Si tienes problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica health check: `curl http://localhost:3000/api/v1/health`
3. Consulta [Troubleshooting completo](./TROUBLESHOOTING.md)
4. Abre un issue en el repositorio

---

**¡Felicitaciones! Tu sistema de notificaciones está funcionando.** 🎉
