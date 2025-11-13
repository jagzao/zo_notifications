# ZO Notifications System 🔔

Sistema de notificaciones **100% web** self-hosted en Docker para recibir eventos de otros proyectos y notificar en tiempo real.

## 🎯 Características

- 🌐 **100% Web** - Sin apps nativas, solo navegador
- 🔔 **Web Push Notifications** - Notificaciones del navegador (incluso cerrado)
- ⚡ **Real-time Dashboard** - WebSockets para updates instantáneos
- ❌ **Discord Integration** - Errores detallados en Discord
- 📱 **PWA** - Instalable como app (opcional)
- 🐳 **Docker Compose** - Deploy con un comando
- 🔐 **Seguro** - API Keys, rate limiting, SSL/TLS
- 💾 **Persistente** - PostgreSQL para historial completo
- 💰 **Costo 0** - Todo self-hosted

## 🏗️ Arquitectura

```
┌──────────────┐
│   Proyectos  │ ──POST──┐
└──────────────┘         │
                         ▼
                  ┌─────────────┐
                  │  API REST   │
                  └──────┬──────┘
                         │
                    ┌────┴────┐
                    │  Redis  │
                    └────┬────┘
                         │
              ┏━━━━━━━━━━┻━━━━━━━━━━┓
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │ Web Push │         │ Discord  │
        │  Worker  │         │  Worker  │
        └────┬─────┘         └────┬─────┘
             │                    │
             ▼                    ▼
    ┌─────────────┐      ┌──────────────┐
    │  Navegador  │      │   Discord    │
    │  (Usuario)  │◄─────┤  Dashboard   │
    └─────────────┘ WS   └──────────────┘
          │
          │ WebSocket + HTTP
          ▼
    ┌─────────────┐
    │   Frontend  │
    │    React    │
    └─────────────┘
```

## 🚀 Quick Start

### Prerrequisitos

- Docker y Docker Compose instalados
- Puertos 3000, 5173, 80, 443 disponibles
- HTTPS en producción (Let's Encrypt gratis)

### Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd zo_notifications

# 2. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores

# 3. Generar keys para Web Push
npm install -g web-push
web-push generate-vapid-keys
# Copiar las keys al .env

# 4. Configurar Discord Webhook
# Discord → Server Settings → Integrations → Webhooks
# Copiar URL al .env

# 5. Levantar servicios
docker-compose up -d

# 6. Abrir dashboard
open http://localhost:5173
```

## 🌐 Interfaces

### Dashboard Principal
- 📋 Lista de notificaciones en tiempo real
- 🔍 Filtros por tipo, proyecto, fecha
- 🔔 Badge con conteo de no leídas
- ⚡ Updates instantáneos vía WebSocket

### Vista de Detalles
- 🐛 Stack traces formateados
- 📝 Context completo del error
- 🏷️ Metadata y tags
- ✅ Marcar como leído/resuelto

### Configuración
- 🔔 Activar/desactivar Web Push
- 🔕 Horarios de silencio
- 🎵 Configurar sonidos
- 🔑 Gestionar API keys

### Estadísticas
- 📊 Gráficos de notificaciones
- 📈 Métricas por proyecto
- 📉 Tasas de éxito/error
- 📅 Historial completo

## 📱 Uso

### Desde tu Código

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/notify/success \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu-api-key" \
  -d '{
    "project": "mi-app",
    "title": "Deploy exitoso",
    "message": "Versión 1.2.3 desplegada"
  }'
```

**Python:**
```python
import requests

requests.post('http://localhost:3000/api/v1/notify/error',
  headers={'X-API-Key': 'tu-key'},
  json={
    'project': 'mi-app',
    'title': 'Error en producción',
    'error': {
      'message': 'Database timeout',
      'stack': error_stack,
      'severity': 'high'
    }
  }
)
```

**Node.js:**
```javascript
await fetch('http://localhost:3000/api/v1/notify/success', {
  method: 'POST',
  headers: {
    'X-API-Key': 'tu-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    project: 'mi-app',
    title: 'Proceso completado',
    message: 'Todo OK'
  })
});
```

## 🏗️ Stack Tecnológico

### Backend
- **Node.js + Express** - API REST
- **Socket.io** - WebSockets real-time
- **web-push** - Web Push API
- **Bull + Redis** - Queue system
- **PostgreSQL** - Database

### Frontend
- **React 18 + TypeScript** - UI Framework
- **Vite** - Build tool
- **Tailwind CSS + Shadcn UI** - Styling
- **React Query** - Data fetching
- **Socket.io-client** - WebSocket client
- **React Router** - Routing

### Infrastructure
- **Docker + Docker Compose** - Containerización
- **Nginx** - Reverse proxy + SSL
- **Let's Encrypt** - SSL certificates

## 📂 Estructura del Proyecto

```
zo_notifications/
├── api/                    # Backend API
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Auth, validation
│   └── Dockerfile
│
├── frontend/              # Frontend React
│   ├── src/
│   │   ├── pages/        # Dashboard, Settings, Stats
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom hooks
│   │   └── services/     # API client
│   ├── public/
│   │   └── sw.js         # Service Worker
│   └── Dockerfile
│
├── workers/               # Background workers
│   ├── webpush-worker/   # Web Push notifications
│   └── discord-worker/   # Discord integration
│
├── database/              # DB migrations
├── nginx/                 # Nginx config
└── docs/                  # Documentation
```

## 🔔 Web Push Notifications

Las notificaciones del navegador funcionan:

✅ Con el navegador cerrado
✅ En desktop y móvil
✅ En Chrome, Firefox, Edge, Safari (iOS 16.4+)
✅ Sin necesidad de instalar apps

El usuario solo necesita:
1. Abrir el dashboard una vez
2. Aceptar permisos de notificaciones
3. ¡Listo! Ya recibirá notificaciones

## 📖 Documentación

- [**PLAN_WEB.md**](./docs/PLAN_WEB.md) - Arquitectura web completa
- [**PLAN_DESARROLLO.md**](./PLAN_DESARROLLO.md) - Plan original con alternativas
- [**API.md**](./docs/API.md) - Documentación de endpoints
- [**QUICK_START.md**](./docs/QUICK_START.md) - Guía de inicio rápido
- [**DECISIONES_TECNICAS.md**](./docs/DECISIONES_TECNICAS.md) - ADRs

## 🔐 Seguridad

- ✅ API Key authentication
- ✅ Rate limiting multinivel
- ✅ HTTPS/SSL obligatorio en producción
- ✅ CORS configurado
- ✅ Request validation
- ✅ Secrets en variables de entorno

## 📊 Monitoreo

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Logs
```bash
# Ver todos los logs
docker-compose logs -f

# Solo un servicio
docker-compose logs -f api
docker-compose logs -f frontend
```

## 🛠️ Desarrollo

```bash
# Modo desarrollo con hot reload
docker-compose -f docker-compose.dev.yml up

# Ejecutar tests
npm test

# Linting
npm run lint

# Build para producción
docker-compose build
```

## 📝 Roadmap

### Fase 1: Backend Base ✅
- [x] Estructura del proyecto
- [x] Documentación completa
- [ ] API REST básica
- [ ] WebSocket server

### Fase 2: Frontend Base
- [ ] Setup React + Vite
- [ ] Dashboard con lista de notificaciones
- [ ] WebSocket client
- [ ] Fetch historial

### Fase 3: Web Push
- [ ] Service Worker
- [ ] Web Push API backend
- [ ] Solicitar permisos frontend
- [ ] Envío de notificaciones

### Fase 4: Integraciones
- [ ] Discord webhooks
- [ ] Queue system con Redis
- [ ] PostgreSQL + migraciones

### Fase 5: Features Avanzadas
- [ ] Vista de detalles
- [ ] Página de configuración
- [ ] Estadísticas y gráficos
- [ ] PWA support

### Fase 6: Producción
- [ ] Nginx setup
- [ ] SSL/TLS
- [ ] Optimizaciones
- [ ] Testing completo

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor lee [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE)

## 🙏 Agradecimientos

- [Discord](https://discord.com) - Webhooks API
- [Socket.io](https://socket.io) - WebSockets
- [Shadcn UI](https://ui.shadcn.com) - Componentes React
- Comunidad open source

---

**Notificaciones web en tiempo real, sin apps, con costo 0** 🚀

¿Preguntas? Abre un issue o consulta la [documentación completa](./docs/).
