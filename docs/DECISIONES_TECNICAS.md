# Decisiones Técnicas - ZO Notifications

Este documento registra las decisiones arquitectónicas importantes tomadas durante el desarrollo del sistema.

## 🎯 ADR (Architecture Decision Records)

### ADR-001: Stack Tecnológico Principal

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Necesitamos elegir el stack tecnológico para el sistema de notificaciones.

**Opciones Consideradas**:

1. **Node.js + Express**
   - ✅ Ecosistema maduro y extenso
   - ✅ Fácil de encontrar desarrolladores
   - ✅ Excelente para I/O asíncrono
   - ✅ NPM packages para todo
   - ❌ Single-threaded (mitigado con workers)

2. **Python + FastAPI**
   - ✅ Moderno y rápido
   - ✅ Type hints nativos
   - ✅ Excelente documentación automática
   - ✅ Ideal si integras con ML/Data Science
   - ❌ Menor ecosistema para workers

3. **Go + Fiber/Gin**
   - ✅ Rendimiento excepcional
   - ✅ Binario único
   - ✅ Bajo consumo de memoria
   - ❌ Curva de aprendizaje
   - ❌ Menos librerías

**Decisión**: Node.js + Express

**Razones**:
- Balance perfecto entre simplicidad y rendimiento
- Gran cantidad de librerías para integraciones
- BullMQ es excelente para queues
- Fácil mantenimiento y debugging
- Permite growth futuro sin problemas

---

### ADR-002: Sistema de Push Notifications

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Necesitamos un sistema de push notifications confiable y de bajo costo.

**Opciones Consideradas**:

1. **Ntfy.sh**
   - ✅ Gratis y open source
   - ✅ Puede ser self-hosted
   - ✅ Apps nativas Android/iOS
   - ✅ API simple
   - ✅ No requiere registro
   - ❌ Menos features que FCM

2. **Firebase Cloud Messaging (FCM)**
   - ✅ Gratis hasta 10M mensajes/mes
   - ✅ Muy robusto
   - ✅ Analytics incluidos
   - ❌ Requiere cuenta Google
   - ❌ Más complejo de configurar
   - ❌ Requiere app custom o service externo

3. **Gotify**
   - ✅ Completamente self-hosted
   - ✅ Control total
   - ✅ App Android nativa
   - ❌ No tiene app iOS oficial
   - ❌ Requiere mantener servidor adicional

4. **Telegram Bot**
   - ✅ Muy fácil de usar
   - ✅ No requiere app adicional
   - ✅ Gratis sin límites prácticos
   - ❌ Requiere tener Telegram
   - ❌ Rate limits estrictos

**Decisión**: Ntfy.sh (con opción de FCM como alternativa)

**Razones**:
- Simplicidad extrema de implementación
- Puede usarse servidor público o self-hosted
- Apps nativas disponibles
- No requiere registro ni configuración compleja
- Perfecto para uso personal/low-volume
- Fácil migrar a FCM si se necesita más adelante

---

### ADR-003: Queue System

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Necesitamos un sistema de colas para procesar notificaciones de forma asíncrona.

**Opciones Consideradas**:

1. **Redis + BullMQ**
   - ✅ Muy maduro y probado
   - ✅ UI dashboard disponible (Bull Board)
   - ✅ Retry automático
   - ✅ Prioridades y delays
   - ✅ Bajo consumo de recursos
   - ❌ No persistente por defecto

2. **RabbitMQ**
   - ✅ Muy robusto
   - ✅ Múltiples protocolos
   - ✅ Persistencia garantizada
   - ❌ Más complejo
   - ❌ Mayor consumo de recursos
   - ❌ Overkill para este caso

3. **Apache Kafka**
   - ✅ Máximo rendimiento
   - ✅ Event streaming
   - ❌ Muy complejo
   - ❌ Alto consumo de recursos
   - ❌ Definitivamente overkill

**Decisión**: Redis + BullMQ

**Razones**:
- Perfecto balance complejidad/features
- Redis ya es útil para cache y rate limiting
- BullMQ es específico para Node.js
- Bull Board da UI gratis
- Suficiente para millones de mensajes
- Retry y priorización built-in

---

### ADR-004: Base de Datos

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Necesitamos persistir historial de notificaciones y configuración.

**Opciones Consideradas**:

1. **PostgreSQL**
   - ✅ Robusto y confiable
   - ✅ JSONB para flexibilidad
   - ✅ Full-text search
   - ✅ Excelente para analytics
   - ❌ Más pesado que SQLite

2. **SQLite**
   - ✅ Sin servidor
   - ✅ Muy liviano
   - ✅ Perfecto para single-instance
   - ❌ No concurrent writes
   - ❌ Dificulta escalar

3. **MongoDB**
   - ✅ Flexible schema
   - ✅ Bueno para logs
   - ❌ Más recursos
   - ❌ Overkill para este caso

**Decisión**: PostgreSQL

**Razones**:
- Mejor opción para producción
- JSONB permite guardar payloads flexibles
- Fácil hacer queries y analytics
- Backups y replicación maduros
- Permite escalar si es necesario

---

### ADR-005: Seguridad - Autenticación

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: El API necesita estar protegido pero ser fácil de usar.

**Opciones Consideradas**:

1. **API Keys**
   - ✅ Simple de implementar
   - ✅ Fácil de usar
   - ✅ Perfecto para machine-to-machine
   - ❌ No hay scopes/permisos granulares

2. **OAuth2**
   - ✅ Estándar de industria
   - ✅ Scopes y permisos
   - ❌ Muy complejo para este caso
   - ❌ Requiere auth server

3. **JWT**
   - ✅ Stateless
   - ✅ Claims customizables
   - ❌ Más complejo que API keys
   - ❌ No hay uso de sesiones aquí

**Decisión**: API Keys (con opción de JWT futuro)

**Razones**:
- Simplicidad para el caso de uso
- Perfecto para integraciones M2M
- Fácil rotar keys
- Suficiente con rate limiting
- Puede complementarse con IP whitelist

**Implementación**:
```
Header: X-API-Key: tu-api-key-aqui
```

---

### ADR-006: Formato de Mensajes

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Necesitamos un formato estándar para recibir notificaciones.

**Decisión**: JSON con schema validado

**Schema Mínimo**:
```json
{
  "type": "success|error|warning|info",
  "project": "string",
  "title": "string",
  "message": "string",
  "metadata": {}, // opcional
  "error": {}, // solo para type=error
  "timestamp": "ISO 8601" // opcional, auto-generado
}
```

**Razones**:
- JSON es universal
- Fácil de validar con JSON Schema
- Extensible con metadata
- Type permite ruteo automático

---

### ADR-007: Rate Limiting Strategy

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Prevenir spam y abuse del sistema.

**Decisión**: Multi-layer rate limiting

**Capas**:
1. **Nginx**: 100 req/min por IP
2. **API**: 100 req/min por API Key
3. **Push Notifications**: 10/hora con agrupación
4. **Discord**: Sin límite (Discord ya tiene sus propios límites)

**Agrupación inteligente**:
- Mensajes similares en 5 min → agrupados
- Errores repetidos → solo 1 cada 30 min
- Digest diario para stats

---

### ADR-008: Logging Strategy

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Necesitamos logs útiles sin consumir mucho espacio.

**Decisión**: Structured logging con niveles

**Niveles**:
- ERROR: Errores que requieren atención
- WARN: Cosas inusuales pero manejadas
- INFO: Eventos importantes
- DEBUG: Solo en desarrollo

**Formato**: JSON para fácil parsing

**Retención**:
- ERROR logs: 30 días
- INFO logs: 7 días
- DEBUG logs: 1 día (solo dev)

---

### ADR-009: Health Checks

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Monitorear salud del sistema.

**Decisión**: Health check endpoint completo

**Endpoint**: `GET /api/v1/health`

**Chequeos**:
- Redis conectado y respondiendo
- PostgreSQL conectado y respondiendo
- Workers procesando (heartbeat)
- Queue depth < threshold
- Disk space > 10%

**Respuesta**:
```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "redis": "ok",
    "postgres": "ok",
    "workers": "ok",
    "queue": "ok",
    "disk": "ok"
  },
  "timestamp": "2025-11-13T10:30:00Z",
  "uptime": 86400
}
```

---

### ADR-010: Error Handling

**Estado**: Propuesta
**Fecha**: 2025-11-13
**Contexto**: Manejo consistente de errores.

**Decisión**: Error codes estándar + retry logic

**HTTP Status Codes**:
- 200: Success
- 400: Bad request (validación)
- 401: Unauthorized (API key inválida)
- 429: Too many requests
- 500: Internal error
- 503: Service unavailable

**Retry Logic**:
- Network errors: 3 reintentos con backoff exponencial
- Rate limit: Esperar y reintentar
- Validation errors: No reintentar
- Server errors: 3 reintentos

---

## 🔄 Futuras Decisiones Pendientes

- Monitoreo: Prometheus vs CloudWatch vs Datadog
- Backups: Estrategia de backup automático
- Escalabilidad: Cuándo separar en múltiples instancias
- CI/CD: GitHub Actions vs Jenkins vs GitLab CI

---

## 📝 Template para Nuevas Decisiones

```markdown
### ADR-XXX: Título

**Estado**: Propuesta|Aceptada|Rechazada|Deprecada
**Fecha**: YYYY-MM-DD
**Contexto**: ¿Qué problema estamos resolviendo?

**Opciones Consideradas**:
1. Opción A
   - Pro 1
   - Pro 2
   - Con 1

2. Opción B
   - Pro 1
   - Con 1

**Decisión**: La opción elegida

**Razones**:
- Razón 1
- Razón 2

**Consecuencias**:
- Positivas
- Negativas
```
