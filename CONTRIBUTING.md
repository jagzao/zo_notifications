# Contribuyendo a ZO Notifications

¡Gracias por tu interés en contribuir! Este documento te guiará en el proceso.

## 🚀 Cómo Contribuir

### Reportar Bugs

Si encuentras un bug:

1. Verifica que no exista un issue similar
2. Crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Versión del sistema y entorno
   - Logs relevantes

### Sugerir Features

Para proponer nuevas funcionalidades:

1. Abre un issue con el tag `enhancement`
2. Describe claramente:
   - El problema que resuelve
   - Cómo te imaginas la solución
   - Alternativas consideradas
   - Impacto en el sistema actual

### Pull Requests

1. **Fork el repositorio**

2. **Crea una rama** desde `main`:
   ```bash
   git checkout -b feature/mi-nueva-funcionalidad
   # o
   git checkout -b fix/mi-bug-fix
   ```

3. **Haz tus cambios**:
   - Sigue el estilo de código existente
   - Añade tests si aplica
   - Actualiza documentación si es necesario
   - Commits descriptivos y atómicos

4. **Verifica que todo funcione**:
   ```bash
   # Lint
   npm run lint

   # Tests
   npm test

   # Build
   docker-compose build

   # Test completo
   docker-compose up
   ```

5. **Push y crea el PR**:
   ```bash
   git push origin feature/mi-nueva-funcionalidad
   ```

6. **Describe tu PR**:
   - Qué cambia y por qué
   - Cómo probarlo
   - Screenshots si aplica
   - Referencias a issues relacionados

## 📝 Estándares de Código

### Commits

Usa [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: añade soporte para Telegram notifications
fix: corrige retry logic en push worker
docs: actualiza README con nuevos ejemplos
refactor: simplifica validación de API keys
test: añade tests para Discord worker
chore: actualiza dependencias
```

### Código JavaScript/Node.js

```javascript
// Usa ESLint config del proyecto
// Naming conventions:
// - camelCase para variables y funciones
// - PascalCase para clases
// - UPPER_SNAKE_CASE para constantes

// Comentarios útiles
/**
 * Envía una notificación push
 * @param {Object} notification - Datos de la notificación
 * @param {string} notification.title - Título del mensaje
 * @param {string} notification.message - Cuerpo del mensaje
 * @returns {Promise<boolean>} - true si se envió exitosamente
 */
async function sendPushNotification(notification) {
  // Implementation
}
```

### Estructura de Archivos

```
nueva-feature/
├── index.js          # Punto de entrada
├── service.js        # Lógica de negocio
├── routes.js         # Rutas HTTP (si aplica)
├── middleware.js     # Middleware (si aplica)
├── tests/
│   └── service.test.js
└── README.md         # Documentación de la feature
```

## 🧪 Testing

### Tests Unitarios

```javascript
// Usa Jest
describe('NotificationService', () => {
  it('should send push notification successfully', async () => {
    const notification = {
      title: 'Test',
      message: 'Test message'
    };

    const result = await notificationService.sendPush(notification);
    expect(result).toBe(true);
  });
});
```

### Tests de Integración

```javascript
describe('API Integration', () => {
  it('POST /api/v1/notify/success should return 200', async () => {
    const response = await request(app)
      .post('/api/v1/notify/success')
      .set('X-API-Key', testApiKey)
      .send({
        project: 'test',
        title: 'Test',
        message: 'Test message'
      });

    expect(response.status).toBe(200);
  });
});
```

## 📚 Documentación

Al añadir features:

1. **README.md**: Actualiza si cambia el uso básico
2. **docs/API.md**: Documenta nuevos endpoints
3. **PLAN_DESARROLLO.md**: Actualiza roadmap si aplica
4. **docs/DECISIONES_TECNICAS.md**: Añade ADR para decisiones arquitectónicas importantes

## 🔍 Code Review

Tu PR será revisado considerando:

- ✅ Funcionalidad: Resuelve el problema correctamente
- ✅ Calidad: Código limpio y mantenible
- ✅ Tests: Cobertura adecuada
- ✅ Documentación: Cambios documentados
- ✅ Performance: No degrada el rendimiento
- ✅ Seguridad: No introduce vulnerabilidades
- ✅ Compatibilidad: No rompe features existentes

## 🎯 Áreas que Necesitan Ayuda

Siempre buscamos ayuda en:

- 📱 Clientes para diferentes plataformas
- 🧪 Más tests y cobertura
- 📖 Mejorar documentación
- 🌍 Traducciones
- 🐛 Fix de bugs
- ⚡ Optimizaciones de performance
- 🔐 Mejoras de seguridad

## 💬 Comunicación

- **Issues**: Para bugs y features
- **Discussions**: Para preguntas y conversaciones
- **Pull Requests**: Para código

## 📜 Licencia

Al contribuir, aceptas que tu código se licencie bajo MIT License.

## 🙏 Agradecimientos

Todas las contribuciones son valoradas, sin importar su tamaño. ¡Gracias por ayudar a mejorar ZO Notifications!

---

¿Dudas? Abre un issue con la etiqueta `question`.
