# ZO Notifications - Cliente JavaScript

Cliente simplificado para Node.js y JavaScript.

## Instalación

```bash
npm install axios
```

## Uso Básico

```javascript
const ZONotifications = require('./zo-notifications');

const notifier = new ZONotifications('tu-api-key', {
  baseURL: 'http://localhost:3000/api/v1'  // Opcional
});

// Notificación de éxito
await notifier.success(
  'mi-app',
  'Proceso completado',
  'La operación se completó exitosamente'
);

// Notificación de error
await notifier.error(
  'mi-app',
  'Error en proceso',
  {
    message: 'Falló la conexión a la base de datos',
    severity: 'high'
  }
);
```

## Wrapper de Funciones

Envuelve funciones para notificar automáticamente:

```javascript
const myFunction = notifier.wrap('mi-app', async (data) => {
  // Tu código aquí
  return processData(data);
}, {
  successTitle: 'Procesamiento completado',
  errorSeverity: 'critical'
});

// Automáticamente notifica éxito o error
await myFunction(myData);
```

## Métodos Disponibles

- `success(project, title, message, metadata)` - Notificación de éxito
- `error(project, title, errorData, context)` - Notificación de error
- `warning(project, title, message, metadata)` - Notificación de advertencia
- `info(project, title, message, metadata)` - Notificación informativa
- `getStats(period, project)` - Obtener estadísticas
- `health()` - Verificar estado del sistema
- `wrap(project, fn, options)` - Envolver función con notificaciones automáticas

## Características

- ✅ Retry automático en errores de red
- ✅ Timeout configurable
- ✅ Manejo de errores mejorado
- ✅ Wrapper para funciones
- ✅ TypeScript-friendly
