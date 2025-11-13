# ZO Notifications System 🔔

Sistema de notificaciones self-hosted en Docker para recibir eventos de otros proyectos y notificar a través de push notifications y Discord.

## 🎯 Características

- ✅ **Push Notifications** al celular para mensajes de éxito
- ❌ **Discord Webhooks** para errores con detalles completos
- 🐳 **Docker Compose** - Deploy con un comando
- 🔐 **Seguro** - API Keys, rate limiting, SSL/TLS
- 📊 **Monitoreo** - Logs, métricas y health checks
- 🚀 **Escalable** - Queue system con Redis
- 💾 **Persistente** - PostgreSQL para historial

## 🚀 Quick Start

### Prerrequisitos

- Docker y Docker Compose instalados
- Puertos 80, 443, 3000 disponibles

### Instalación

```bash
# 1. Clonar y configurar
git clone <repo-url>
cd zo_notifications

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Editar .env con tus credenciales
nano .env

# 4. Levantar servicios
docker-compose up -d

# 5. Verificar estado
curl http://localhost:3000/api/v1/health
```

## 📖 Documentación

- [Plan de Desarrollo](./PLAN_DESARROLLO.md) - Arquitectura completa y roadmap
- [API Documentation](./docs/API.md) - Endpoints y ejemplos
- [Deployment Guide](./docs/DEPLOYMENT.md) - Guía de despliegue

## 🔧 Configuración Rápida

### 1. Discord Webhook

1. Ve a tu servidor de Discord
2. Server Settings → Integrations → Webhooks
3. Create Webhook
4. Copia la URL y añádela a `.env`:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

### 2. Push Notifications (Ntfy.sh)

**Opción A: Usar servidor público**
```bash
# En .env
NTFY_SERVER=https://ntfy.sh
NTFY_TOPIC=tu-nombre-unico-secreto
```

**Opción B: Self-hosted**
```bash
# Incluido en docker-compose.yml
NTFY_SERVER=http://ntfy:80
NTFY_TOPIC=notifications
```

**En tu celular:**
1. Instala Ntfy desde [Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy) o [App Store](https://apps.apple.com/app/ntfy/id1625396347)
2. Suscríbete al topic configurado

## 📱 Uso

### Enviar notificación de éxito

```bash
curl -X POST http://localhost:3000/api/v1/notify/success \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu-api-key" \
  -d '{
    "project": "mi-app",
    "title": "Deploy exitoso",
    "message": "La aplicación se desplegó correctamente"
  }'
```

### Enviar notificación de error

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
    }
  }'
```

## 🏗️ Stack Tecnológico

- **API**: Node.js + Express
- **Queue**: Redis + BullMQ
- **Database**: PostgreSQL
- **Proxy**: Nginx
- **Push**: Ntfy.sh
- **Discord**: Webhooks

## 📂 Estructura del Proyecto

```
zo_notifications/
├── api/              # API REST
├── workers/          # Workers de procesamiento
├── nginx/            # Configuración de Nginx
├── database/         # Migraciones y schemas
├── docs/             # Documentación
└── docker-compose.yml
```

## 🔐 Seguridad

- ✅ API Key authentication
- ✅ Rate limiting
- ✅ SSL/TLS encryption
- ✅ Request validation
- ✅ CORS configured
- ✅ Environment variables for secrets

## 📊 Monitoreo

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Estadísticas
```bash
curl http://localhost:3000/api/v1/stats \
  -H "X-API-Key: tu-api-key"
```

### Logs
```bash
# Ver logs de API
docker-compose logs -f api

# Ver logs de workers
docker-compose logs -f push-worker discord-worker
```

## 🛠️ Desarrollo

```bash
# Modo desarrollo
docker-compose -f docker-compose.dev.yml up

# Ejecutar tests
npm test

# Linting
npm run lint
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

- [x] Plan de desarrollo completo
- [ ] Implementación básica de API
- [ ] Integración con Ntfy.sh
- [ ] Integración con Discord
- [ ] Sistema de queue con Redis
- [ ] Dashboard web
- [ ] CLI tool
- [ ] Métricas y monitoring avanzado

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles

## 🙏 Agradecimientos

- [Ntfy.sh](https://ntfy.sh) - Push notifications
- [Discord](https://discord.com) - Webhooks API
- Comunidad open source

---

**Hecho con ❤️ para notificaciones confiables y sin costo**
