# Plan Web - Sistema de Notificaciones sin Apps 🌐

## 🎯 Objetivo Actualizado

Sistema de notificaciones **100% web** - sin necesidad de instalar apps nativas.

## 🏗️ Arquitectura Web

```
┌─────────────────────────────────────────────────────────┐
│                    Otros Proyectos                       │
│              (Envían HTTP POST)                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              API REST (Node.js)                          │
│  - Recibe notificaciones                                 │
│  - Autenticación API Key                                 │
│  - Enqueue mensajes                                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Redis Queue + PubSub                        │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌──────────────┐    ┌──────────────┐
│   Worker     │    │   Worker     │
│   Web Push   │    │   Discord    │
└──────┬───────┘    └──────────────┘
       │                     │
       ▼                     ▼
┌──────────────┐    ┌──────────────┐
│  Navegador   │    │   Discord    │
│  (Web Push)  │    │   Webhook    │
└──────────────┘    └──────────────┘
       ▲
       │
       │ WebSocket
       │
┌──────────────────────────────────────┐
│         Frontend Web (React)          │
│  - Dashboard de notificaciones       │
│  - Historial en tiempo real          │
│  - Configuración                     │
│  - PWA (opcional para móvil)         │
└──────────────────────────────────────┘
```

## 🎨 Frontend - ¿Qué Framework?

### Opción A: React + Vite (Recomendado)
```javascript
// Ventajas:
✅ Ecosistema enorme
✅ Vite = desarrollo ultra rápido
✅ React = fácil encontrar ejemplos
✅ Muchas librerías de UI (Shadcn, MUI, Chakra)
✅ PWA fácil de configurar

// Stack recomendado:
- React 18 + TypeScript
- Vite
- Tailwind CSS + Shadcn UI
- React Query (data fetching)
- Socket.io-client (WebSockets)
```

### Opción B: Vue 3 + Vite
```javascript
✅ Más simple que React
✅ Composition API moderna
✅ Documentación excelente
✅ Menos boilerplate
```

### Opción C: Svelte + SvelteKit
```javascript
✅ Código más limpio
✅ Menos código = más rápido
✅ Bundle size pequeño
❌ Ecosistema más pequeño
```

**Recomendación: React + Vite + Tailwind + Shadcn UI**

## 🔔 Notificaciones Web

### 1. Web Push API (Notificaciones del navegador)

```javascript
// Características:
✅ Notificaciones nativas del navegador
✅ Funcionan incluso con la pestaña cerrada
✅ Gratis, sin servicios externos
✅ Soportado en Chrome, Firefox, Edge, Safari
⚠️  Requiere HTTPS
⚠️  Usuario debe dar permiso

// Implementación:
1. Service Worker registrado
2. Push subscription al backend
3. Backend envía notificaciones usando web-push
```

### 2. WebSockets para Real-Time

```javascript
// Características:
✅ Actualizaciones instantáneas en el dashboard
✅ No requiere refresh
✅ Conexión bidireccional
✅ Perfecto para mostrar notificaciones en la UI

// Implementación:
- Socket.io en backend
- Socket.io-client en frontend
- Eventos: new_notification, notification_update
```

### 3. PWA (Progressive Web App)

```javascript
// Características:
✅ Instalable en el celular (como app)
✅ Funciona offline (básico)
✅ Icono en home screen
✅ Sin necesidad de app stores
⚠️  Es opcional, no obligatorio

// Beneficios:
- Usuario puede "instalar" desde el navegador
- Experiencia similar a app nativa
- Sigue siendo 100% web
```

## 📱 Interfaces del Frontend

### 1. Dashboard Principal
```
┌────────────────────────────────────────────┐
│  ZO Notifications           🔔 5 nuevas    │
├────────────────────────────────────────────┤
│  Filtros: [Todos] [Success] [Error] [🔍]  │
├────────────────────────────────────────────┤
│  ✅ Deploy exitoso - mi-app                │
│     hace 2 minutos                          │
│     Versión 1.2.3 desplegada               │
├────────────────────────────────────────────┤
│  ❌ Error en producción - mi-api           │
│     hace 5 minutos                          │
│     Database connection timeout            │
│     [Ver detalles] [Marcar como leído]     │
├────────────────────────────────────────────┤
│  ⚠️  Memoria alta - servidor-01            │
│     hace 10 minutos                         │
│     85% de uso de memoria                  │
└────────────────────────────────────────────┘
```

### 2. Vista de Detalle de Error
```
┌────────────────────────────────────────────┐
│  ← Volver                                  │
│                                            │
│  ❌ Error en producción                    │
│  Proyecto: mi-api                          │
│  hace 5 minutos                            │
│                                            │
│  Error Message:                            │
│  Database connection timeout               │
│                                            │
│  Stack Trace:                              │
│  ┌────────────────────────────────────┐   │
│  │ Error: Connection timeout          │   │
│  │   at Database.connect (db.js:45)   │   │
│  │   at handler (routes.js:120)       │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Context:                                  │
│  • Endpoint: /api/users                    │
│  • Method: GET                             │
│  • User ID: 12345                          │
│                                            │
│  [Marcar resuelto] [Enviar a Discord]     │
└────────────────────────────────────────────┘
```

### 3. Configuración
```
┌────────────────────────────────────────────┐
│  ⚙️ Configuración                          │
├────────────────────────────────────────────┤
│  Notificaciones del Navegador              │
│  ○ Habilitadas  ○ Deshabilitadas          │
│  [Solicitar permiso]                       │
│                                            │
│  Filtros                                   │
│  ☑ Notificar éxitos                       │
│  ☑ Notificar errores                      │
│  ☑ Notificar warnings                     │
│  □ Notificar info                         │
│                                            │
│  Sonidos                                   │
│  ☑ Sonido para errores                    │
│  □ Sonido para éxitos                     │
│                                            │
│  Horario de Silencio                       │
│  Desde: [22:00] Hasta: [07:00]            │
│  ☑ Habilitar modo no molestar             │
│                                            │
│  API Keys                                  │
│  • project-a: ****abc123                   │
│  • project-b: ****xyz789                   │
│  [+ Generar nueva key]                     │
└────────────────────────────────────────────┘
```

### 4. Estadísticas
```
┌────────────────────────────────────────────┐
│  📊 Estadísticas - Últimas 24h            │
├────────────────────────────────────────────┤
│  Total notificaciones: 1,247              │
│                                            │
│  Por tipo:                                 │
│  ✅ Success: 980 (78%)  ████████░         │
│  ❌ Error: 45 (4%)      █░                │
│  ⚠️  Warning: 122 (10%) ██░               │
│  ℹ️  Info: 100 (8%)     ██░               │
│                                            │
│  Por proyecto:                             │
│  mi-app: 500           ██████░            │
│  mi-api: 300           ████░              │
│  data-pipeline: 447    █████░             │
│                                            │
│  [Gráfico de líneas - últimos 7 días]     │
│  [Descargar reporte]                       │
└────────────────────────────────────────────┘
```

## 📦 Estructura del Proyecto Actualizada

```
zo_notifications/
├── docker-compose.yml
├── .env.example
│
├── api/                      # Backend (Node.js)
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── notifications.js
│   │   │   └── webpush.js    # ← Nuevo
│   │   ├── services/
│   │   │   ├── webpush.js    # ← Nuevo
│   │   │   ├── websocket.js  # ← Nuevo
│   │   │   └── discord.js
│   │   └── middleware/
│
├── frontend/                  # ← NUEVO Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── public/
│   │   ├── sw.js            # Service Worker
│   │   └── manifest.json    # PWA manifest
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Details.tsx
│       │   ├── Settings.tsx
│       │   └── Stats.tsx
│       ├── components/
│       │   ├── NotificationCard.tsx
│       │   ├── NotificationList.tsx
│       │   ├── FilterBar.tsx
│       │   └── ErrorDetails.tsx
│       ├── hooks/
│       │   ├── useNotifications.ts
│       │   ├── useWebPush.ts
│       │   └── useWebSocket.ts
│       ├── services/
│       │   ├── api.ts
│       │   └── notifications.ts
│       └── lib/
│           └── utils.ts
│
├── workers/
│   ├── webpush-worker/       # ← Actualizado
│   └── discord-worker/
│
├── nginx/
│   └── nginx.conf            # ← Servir frontend también
│
└── docs/
    ├── PLAN_WEB.md           # ← Este documento
    └── FRONTEND.md           # ← Guía del frontend
```

## 🔄 Docker Compose Actualizado

```yaml
version: '3.8'

services:
  # API REST
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - WEB_PUSH_PUBLIC_KEY=${WEB_PUSH_PUBLIC_KEY}
      - WEB_PUSH_PRIVATE_KEY=${WEB_PUSH_PRIVATE_KEY}
      - WEB_PUSH_EMAIL=${WEB_PUSH_EMAIL}
    # ... resto de config

  # Frontend Web
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"  # Dev mode
      # En producción Nginx servirá el build
    environment:
      - VITE_API_URL=http://localhost:3000
      - VITE_WS_URL=ws://localhost:3000
    depends_on:
      - api

  # Nginx (producción)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html  # Frontend build
    depends_on:
      - api
      - frontend

  # ... redis, postgres, workers
```

## 🚀 Plan de Implementación Actualizado

### Fase 1: Backend Base (Día 1)
- [x] ~~Setup básico con Ntfy~~
- [ ] API REST con endpoints básicos
- [ ] WebSocket server (Socket.io)
- [ ] PostgreSQL + Redis

### Fase 2: Frontend Base (Día 2-3)
- [ ] Setup React + Vite + Tailwind
- [ ] Dashboard básico
- [ ] Lista de notificaciones
- [ ] Conexión WebSocket
- [ ] Fetch de historial desde API

### Fase 3: Web Push Notifications (Día 3-4)
- [ ] Service Worker
- [ ] Web Push API en backend
- [ ] Solicitar permisos en frontend
- [ ] Enviar push notifications desde backend
- [ ] Testing de notificaciones

### Fase 4: Discord Integration (Día 4)
- [ ] Worker para Discord (mantener)
- [ ] Webhook setup
- [ ] Embeds ricos con errores

### Fase 5: Features Avanzadas (Día 5-6)
- [ ] Vista de detalles de notificaciones
- [ ] Página de configuración
- [ ] Página de estadísticas
- [ ] Filtros y búsqueda
- [ ] Marcar como leído/no leído

### Fase 6: PWA & Polish (Día 6-7)
- [ ] Manifest.json para PWA
- [ ] Iconos y assets
- [ ] Offline support básico
- [ ] Optimización de performance
- [ ] Testing en móvil

### Fase 7: Producción (Día 7)
- [ ] Nginx config para servir frontend
- [ ] SSL/TLS setup
- [ ] Build optimization
- [ ] Testing completo

## 💻 Stack Tecnológico Final

### Backend
- **Node.js + Express**: API REST
- **Socket.io**: WebSockets
- **web-push**: Web Push API
- **Bull + Redis**: Queue system
- **PostgreSQL**: Database
- **Discord.js** o **axios**: Discord webhooks

### Frontend
- **React 18 + TypeScript**: UI
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Shadcn UI**: Componentes
- **React Query**: Data fetching
- **Socket.io-client**: WebSocket client
- **React Router**: Routing
- **Zustand** o **Jotai**: State management (ligero)

### Infrastructure
- **Docker + Docker Compose**: Containerización
- **Nginx**: Reverse proxy + static files
- **Let's Encrypt**: SSL gratis

## 🔐 Ventajas de Web Push vs Apps Nativas

### ✅ Ventajas
- No necesita instalar nada (solo abrir navegador)
- Funciona en desktop y móvil
- Updates instantáneos (no hay que actualizar app)
- Desarrollo más rápido (un solo codebase)
- Notificaciones funcionan incluso con pestaña cerrada
- PWA permite "instalación" opcional

### ⚠️ Consideraciones
- Requiere HTTPS en producción
- Usuario debe dar permiso para notificaciones
- En iOS Safari, las Web Push llegaron en 2023 (iOS 16.4+)
- Notificaciones de navegador pueden ser menos "nativas"

## 🎯 Flujo de Usuario

### Primera Vez
1. Usuario abre `https://tu-dominio.com`
2. Ve el dashboard (vacío inicialmente)
3. Sistema solicita permiso para notificaciones
4. Usuario acepta (o rechaza)
5. Si acepta: se registra la subscription
6. Usuario está listo para recibir notificaciones

### Recibir Notificación
1. Tu proyecto envía POST al API
2. API guarda en DB y publica en Redis
3. Worker de WebPush procesa
4. Envía notificación al navegador del usuario
5. Usuario ve notificación (incluso con navegador cerrado)
6. Si hace click: abre el dashboard con detalles
7. Dashboard también actualiza en real-time vía WebSocket

### Ver Historial
1. Usuario abre dashboard
2. Ve lista de todas las notificaciones
3. Puede filtrar por tipo, proyecto, fecha
4. Click en una notificación → ver detalles completos
5. Puede marcar como leída

## 📱 Responsive Design

```
Desktop (1920px+):
┌─────────────────────────────────────────┐
│  Sidebar  │  Main Content  │  Details  │
│  (navs)   │  (list)        │  (panel)  │
└─────────────────────────────────────────┘

Tablet (768px-1920px):
┌─────────────────────────────────┐
│  Top Nav                        │
├─────────────────────────────────┤
│  Main Content                   │
│  (list + details stack)         │
└─────────────────────────────────┘

Mobile (< 768px):
┌─────────────┐
│  Top Nav    │
├─────────────┤
│  List       │
│  (full)     │
└─────────────┘
```

## 🔧 Configuración de Web Push

### Backend Setup
```bash
# Generar keys para Web Push
npm install web-push -g
web-push generate-vapid-keys

# Salida:
# Public Key: BCxxxxxxxxx...
# Private Key: xxxxxxxxx...

# Añadir a .env
WEB_PUSH_PUBLIC_KEY=BCxxxxxxxxx...
WEB_PUSH_PRIVATE_KEY=xxxxxxxxx...
WEB_PUSH_EMAIL=tu-email@example.com
```

### Frontend Setup
```javascript
// src/lib/webpush.ts
export async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_PUSH_PUBLIC_KEY
  });

  // Enviar subscription al backend
  await fetch('/api/v1/webpush/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## 🎨 UI/UX Recommendations

### Colores por Tipo
- **Success** (✅): Verde - `#10b981` (emerald-500)
- **Error** (❌): Rojo - `#ef4444` (red-500)
- **Warning** (⚠️): Amarillo - `#f59e0b` (amber-500)
- **Info** (ℹ️): Azul - `#3b82f6` (blue-500)

### Sonidos
- Error: Sonido de alerta
- Success: Sonido suave (opcional)
- Silencio durante horarios configurados

### Iconos
- Usar emojis o lucide-react icons
- Badge con contador de no leídas
- Favicon que cambie con notificaciones nuevas

## 🚦 Próximos Pasos Inmediatos

1. **Confirmar stack**: ¿React está bien?
2. **Crear estructura frontend**
3. **Implementar backend con WebSocket + Web Push**
4. **UI básica del dashboard**
5. **Conectar todo**
6. **Testing**

## 💡 Features Futuras (Nice to Have)

- [ ] Notificaciones agrupadas
- [ ] Buscar en historial
- [ ] Exportar notificaciones (CSV, JSON)
- [ ] Dark mode
- [ ] Multiple usuarios (auth)
- [ ] Webhooks salientes (callbacks)
- [ ] Integraciones: Slack, Telegram, Email
- [ ] Métricas y gráficos avanzados
- [ ] Notificaciones programadas

---

## ¿Necesitas Frontend? **SÍ, 100%**

Para una experiencia web completa necesitas:
- ✅ Frontend React (dashboard, configuración, historial)
- ✅ Web Push API (notificaciones del navegador)
- ✅ WebSockets (real-time updates)
- ✅ PWA (opcional, para experiencia "app-like")

**Todo el costo sigue siendo 0** - solo añade complejidad de desarrollo pero el hosting es el mismo Docker local.

---

¿Te gusta este enfoque? ¿Empezamos con el frontend React + Web Push?
