# ZO Notifications System 🔔

Sistema de notificaciones **100% web** self-hosted en Docker para recibir eventos de otros proyectos y notificar en tiempo real.

## 🎯 Características

### Core Features
- 🌐 **100% Web** - Sin apps nativas, solo navegador
- 🔔 **Web Push Notifications** - Notificaciones del navegador (incluso cerrado)
- ⚡ **Real-time Dashboard** - WebSockets para updates instantáneos
- 📱 **PWA** - Instalable como app (opcional)
- 🐳 **Docker Compose** - Deploy con un comando
- 💰 **Costo 0** - Todo self-hosted

### Integrations
- ❌ **Discord** - Errores detallados con rich embeds
- 💬 **Slack** - Notificaciones con attachments
- 📧 **Email** - SMTP con HTML templating

### Security & Operations
- 🔐 **Seguridad** - API Keys, rate limiting, SSL/TLS, Nginx
- 💾 **Persistencia** - PostgreSQL con backups automáticos
- 🔧 **Backups** - Scripts de backup/restore encriptados

### Observability Stack
- 📊 **Prometheus** - Recolección de métricas en tiempo real
- 📈 **Grafana** - Dashboards y visualización de datos
- 📝 **Loki + Promtail** - Agregación de logs centralizada
- ⏱️ **Uptime Kuma** - Monitoring de disponibilidad
- 🔍 **Exporters** - PostgreSQL, Redis y Node metrics

### Advanced Features (NEW!)
- 🎯 **Workers Condicionales** - Solo inicia los workers que necesitas (ahorro de recursos)
- ⚡ **Rate Limiting por Proyecto** - Límites diferenciados por tier (free, basic, pro, unlimited)
- 🔄 **Dead Letter Queue** - Captura y gestión de notificaciones fallidas con retry manual
- 📊 **Health Checks** - Endpoints de salud para todos los workers (Prometheus-ready)
- 🔧 **Script de Validación** - Pre-deployment checks automáticos
- 📝 **Log Rotation** - Rotación automática de logs (evita disco lleno)

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

## 📊 Monitoring Stack (Producción)

Para monitoreo completo del sistema, usa `docker-compose.prod.yml`:

```bash
# Iniciar con stack completo de monitoring
docker-compose -f docker-compose.prod.yml up -d
```

### Servicios Incluidos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Grafana** | 3001 | Dashboards y visualización |
| **Prometheus** | 9090 | Métricas del sistema |
| **Loki** | 3100 | Agregación de logs |
| **Uptime Kuma** | 3002 | Monitoring de uptime |
| **API** | 3000 | API REST + Metrics endpoint |
| **Frontend** | 5173 | Dashboard React |

### Acceder a los Dashboards

```bash
# Grafana (usuario: admin, password: admin)
open http://localhost:3001

# Prometheus
open http://localhost:9090

# Uptime Kuma (crear cuenta en primer acceso)
open http://localhost:3002
```

### Métricas Disponibles

El API expone métricas en `/metrics` para Prometheus:

- **HTTP Metrics**: Requests, duración, status codes
- **Notifications**: Total por tipo, proyecto, duración
- **Queues**: Profundidad, jobs procesados, fallos
- **WebSocket**: Conexiones activas, mensajes
- **Database**: Conexiones, query duration
- **Redis**: Operaciones, memory
- **System**: CPU, memoria, heap

Ver documentación completa: [docs/MONITORING.md](docs/MONITORING.md)

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

## 📊 Monitoreo y Logs

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Ver Logs

**Consola (Docker):**
```bash
# Ver todos los logs
docker-compose logs -f

# Solo un servicio
docker-compose logs -f api
docker-compose logs -f frontend
```

**Loki + Grafana (Producción):**
```bash
# Iniciar stack de monitoring
docker-compose -f docker-compose.prod.yml up -d

# Acceder a Grafana Explore → Loki
# Queries de ejemplo:
# {container=~".*api.*"} |= "error"
# {container=~".*worker.*"} | json | severity="high"
```

### Métricas y Dashboards

El stack de producción incluye:

- **Grafana Dashboards**: Visualización en tiempo real
- **Prometheus Metrics**: Endpoint en `/metrics`
- **Uptime Monitoring**: Status de servicios 24/7
- **Log Aggregation**: Todos los logs en un solo lugar

Ver guía completa: [docs/MONITORING.md](docs/MONITORING.md)

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
- [x] API REST básica
- [x] WebSocket server
- [x] PostgreSQL + migraciones
- [x] Redis + BullMQ

### Fase 2: Frontend Base ✅
- [x] Setup React + Vite + TypeScript
- [x] Dashboard con lista de notificaciones
- [x] WebSocket client real-time
- [x] Fetch historial y filtros
- [x] Diseño responsive con Tailwind

### Fase 3: Web Push ✅
- [x] Service Worker
- [x] Web Push API backend
- [x] Solicitar permisos frontend
- [x] Envío de notificaciones
- [x] Gestión de subscripciones

### Fase 4: Integraciones ✅
- [x] Discord webhooks
- [x] Slack webhooks
- [x] Email (SMTP)
- [x] Queue system con Redis
- [x] Workers independientes

### Fase 5: Features Avanzadas ✅
- [x] Vista de detalles
- [x] Estadísticas y gráficos
- [x] PWA support completo
- [x] Backups automáticos
- [x] SDK JavaScript

### Fase 6: Producción ✅
- [x] Nginx setup con SSL
- [x] Scripts de SSL/TLS
- [x] Optimizaciones
- [x] Testing y ejemplos
- [x] Documentación completa

### Fase 7: Observability Stack ✅
- [x] Prometheus para métricas
- [x] Grafana con dashboards
- [x] Loki para logs
- [x] Uptime Kuma
- [x] Exporters (PostgreSQL, Redis, Node)
- [x] Métricas personalizadas en API

### Próximas Mejoras 🚀
- [ ] Alertmanager para notificaciones automáticas
- [ ] Recording rules en Prometheus
- [ ] Más dashboards de Grafana
- [ ] Tests automatizados (Jest, Playwright)
- [ ] CI/CD con GitHub Actions
- [ ] Kubernetes manifests
- [ ] Helm charts

## 📚 Documentación

- **[PLAN_WEB.md](PLAN_WEB.md)** - Arquitectura y decisiones técnicas
- **[EXAMPLES.md](EXAMPLES.md)** - Ejemplos de integración (Bash, Python, Node, PHP, Go)
- **[CHANGELOG.md](CHANGELOG.md)** - Historial de cambios
- **[docs/ADVANCED_FEATURES.md](docs/ADVANCED_FEATURES.md)** - 🆕 Workers condicionales, Rate limiting, DLQ
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** - 🆕 Guía de operaciones, alertas, backups y troubleshooting
- **[docs/LOG_ROTATION.md](docs/LOG_ROTATION.md)** - Gestión y rotación de logs
- **[docs/MONITORING.md](docs/MONITORING.md)** - Guía completa del stack de observabilidad
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Solución de problemas comunes
- **[docs/SECURITY.md](docs/SECURITY.md)** - Best practices de seguridad
- **[RECOMMENDATIONS.md](RECOMMENDATIONS.md)** - Recomendaciones para producción
- **[clients/javascript/README.md](clients/javascript/README.md)** - SDK JavaScript

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor lee [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE)

## 🙏 Agradecimientos

### Core Stack
- [Node.js](https://nodejs.org) - Runtime de JavaScript
- [Express](https://expressjs.com) - Framework web
- [React](https://react.dev) - Framework UI
- [Socket.io](https://socket.io) - WebSockets real-time
- [BullMQ](https://docs.bullmq.io) - Queue system
- [PostgreSQL](https://www.postgresql.org) - Database
- [Redis](https://redis.io) - Cache y pub/sub

### Integrations
- [Discord](https://discord.com) - Webhooks API
- [Slack](https://slack.com) - Webhooks API
- [Web Push Protocol](https://web.dev/push-notifications-overview) - Browser notifications

### Monitoring Stack
- [Prometheus](https://prometheus.io) - Metrics collection
- [Grafana](https://grafana.com) - Dashboards
- [Loki](https://grafana.com/oss/loki) - Log aggregation
- [Uptime Kuma](https://github.com/louislam/uptime-kuma) - Uptime monitoring

### UI & Tooling
- [Vite](https://vitejs.dev) - Build tool
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
- [Docker](https://www.docker.com) - Containerization
- [Nginx](https://nginx.org) - Reverse proxy

Comunidad open source ❤️

---

**Notificaciones web en tiempo real, sin apps, con costo 0** 🚀

¿Preguntas? Abre un issue o consulta la [documentación completa](./docs/).
