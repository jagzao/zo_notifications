# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2025-11-13

### ✨ Agregado

#### Backend
- API REST completa con Express y Node.js
- WebSocket server con Socket.io para updates en tiempo real
- Sistema de autenticación por API Key
- Rate limiting multinivel (por IP y por API Key)
- Validación de requests con Joi schemas
- Logging estructurado con Winston
- Health checks completos del sistema
- Servicio de base de datos PostgreSQL
- Servicio de Redis para pub/sub y cache
- Sistema de queues con BullMQ

#### Endpoints API
- `POST /api/v1/notify/success` - Notificaciones de éxito
- `POST /api/v1/notify/error` - Notificaciones de error
- `POST /api/v1/notify/warning` - Notificaciones de advertencia
- `POST /api/v1/notify/info` - Notificaciones informativas
- `GET /api/v1/health` - Estado del sistema
- `GET /api/v1/stats` - Estadísticas de uso
- `POST /api/v1/webpush/subscribe` - Suscripción a Web Push
- `POST /api/v1/webpush/unsubscribe` - Cancelar suscripción
- `GET /api/v1/webpush/public-key` - Obtener clave pública VAPID
- `POST /api/v1/webpush/test` - Enviar notificación de prueba

#### Frontend
- Dashboard React con TypeScript y Vite
- Lista de notificaciones en tiempo real con WebSocket
- Filtros por tipo (success, error, warning, info)
- Búsqueda de notificaciones
- Activación de Web Push notifications
- Service Worker para Web Push API
- PWA manifest para instalación
- Diseño responsive con Tailwind CSS
- Componentes modulares y reutilizables
- Custom hooks para WebSocket y Web Push
- Badge con contador de notificaciones no leídas

#### Workers
- **WebPush Worker**: Procesa y envía notificaciones push del navegador
  - Soporte para múltiples subscriptions
  - Retry automático con backoff exponencial
  - Rate limiting integrado
  - Manejo de subscriptions expiradas
- **Discord Worker**: Envía notificaciones a Discord
  - Embeds ricos con formateo según tipo
  - Stack traces con syntax highlighting
  - Soporte para diferentes niveles de severidad
  - Rate limiting para Discord API

#### Base de Datos
- Tabla `notifications` - Almacena todas las notificaciones
- Tabla `push_subscriptions` - Suscripciones de navegadores
- Tabla `notification_deliveries` - Historial de envíos
- Tabla `api_keys` - Gestión de API keys
- Índices optimizados para queries frecuentes
- Triggers para `updated_at` automático
- Vistas para estadísticas rápidas
- Migración inicial completa

#### Docker
- Configuración Docker Compose para producción
- Configuración Docker Compose para desarrollo
- Dockerfiles optimizados para cada servicio
- Health checks en todos los servicios
- Volúmenes persistentes para datos
- Network aislada para servicios

#### Documentación
- `README.md` - Overview del proyecto
- `DEPLOYMENT.md` - Guía completa de despliegue
- `PLAN_DESARROLLO.md` - Plan de desarrollo original
- `PLAN_WEB.md` - Arquitectura web detallada
- `EXAMPLES.md` - Ejemplos de uso en múltiples lenguajes
- `CONTRIBUTING.md` - Guía de contribución
- `docs/API.md` - Documentación completa de la API
- `docs/QUICK_START.md` - Guía de inicio rápido
- `docs/DECISIONES_TECNICAS.md` - Decisiones arquitectónicas (ADRs)

#### Scripts Útiles
- `scripts/start.sh` - Script de inicio rápido
- `scripts/stop.sh` - Script para detener servicios
- `scripts/test-notification.sh` - Enviar notificaciones de prueba
- `scripts/generate-vapid-keys.sh` - Generar keys de Web Push

#### Ejemplos de Clientes
- Bash/Shell scripts
- Python client con decoradores
- Node.js/JavaScript con axios
- PHP client
- Go client
- Ejemplos de integración con Express

### 🔒 Seguridad
- Autenticación por API Key en todos los endpoints protegidos
- Rate limiting para prevenir abuse
- Validación estricta de todos los inputs
- Helmet.js para headers de seguridad
- CORS configurado correctamente
- Secrets en variables de entorno
- Usuario no-root en containers Docker

### 🚀 Performance
- WebSocket para comunicación en tiempo real
- Queue system para procesamiento asíncrono
- Índices de base de datos optimizados
- Redis para cache y pub/sub
- Retry automático con backoff exponencial
- Concurrent processing en workers
- Docker multi-stage builds (futuro)

### 📦 Dependencias Principales
- **Backend**: Express, Socket.io, BullMQ, web-push, pg, ioredis, winston
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Socket.io-client, React Query
- **Workers**: BullMQ, web-push, axios, winston

### 🎨 UI/UX
- Diseño dark mode optimizado
- Iconos y badges informativos
- Animaciones sutiles
- Estados de loading
- Mensajes de error descriptivos
- Responsive design mobile-first

### 🔧 Configuración
- Variables de entorno bien documentadas
- Valores por defecto sensatos
- Configuración centralizada
- Soporte para múltiples entornos

## [Unreleased]

### Planeado
- Página de configuración en el frontend
- Página de estadísticas con gráficos
- Vista de detalles de notificación (modal)
- Soporte para marcar notificaciones como leídas
- Filtros avanzados (por proyecto, fecha, etc.)
- Exportar notificaciones (CSV, JSON)
- Dark/Light mode toggle
- Autenticación de usuarios múltiples
- Webhooks salientes (callbacks)
- Integración con más servicios (Slack, Email, SMS)
- Dashboard de métricas con Grafana
- Tests unitarios y de integración
- CI/CD con GitHub Actions
- Documentación de deployment en cloud
- Docker multi-stage builds
- Nginx para producción

### En consideración
- Soporte para i18n (internacionalización)
- Notificaciones programadas
- Reglas de filtrado avanzadas
- API GraphQL
- Mobile app nativa (React Native)
- Desktop app (Electron)
- Browser extension

---

## Tipos de cambios

- `Agregado` - Para nuevas funcionalidades
- `Cambiado` - Para cambios en funcionalidades existentes
- `Deprecado` - Para funcionalidades que serán removidas
- `Eliminado` - Para funcionalidades eliminadas
- `Corregido` - Para corrección de bugs
- `Seguridad` - En caso de vulnerabilidades
