# Security Best Practices - ZO Notifications

Guía de seguridad para producción.

## 🔐 **Seguridad en Producción**

### 1. Variables de Entorno

**❌ NUNCA hacer:**
```bash
# No commitear .env al repositorio
# No usar contraseñas débiles
# No usar "test", "admin", "password"
```

**✅ Hacer:**
```bash
# Generar contraseñas seguras
API_KEY_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)
POSTGRES_PASSWORD=$(openssl rand -base64 24)

# Guardar en gestor de secretos
# - AWS Secrets Manager
# - HashiCorp Vault
# - Docker Secrets
```

### 2. API Keys

**Rotar API Keys periódicamente:**

```sql
-- Listar API keys activas
SELECT id, name, project, created_at, last_used_at
FROM api_keys
WHERE active = true;

-- Crear nueva API key
INSERT INTO api_keys (key, name, project, active)
VALUES (
  encode(gen_random_bytes(32), 'base64'),
  'Production Key',
  'mi-proyecto',
  true
);

-- Desactivar API key antigua
UPDATE api_keys
SET active = false
WHERE id = OLD_KEY_ID;
```

### 3. Rate Limiting

**Configuración recomendada:**

```env
# Por IP
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000  # 1 minuto

# Por API Key (más estricto)
API_KEY_RATE_LIMIT_MAX=1000
API_KEY_RATE_LIMIT_WINDOW_MS=3600000  # 1 hora
```

**Monitorear rate limiting:**

```bash
# Ver quién está siendo rate limited
docker-compose logs api | grep "Rate limit exceeded"

# Bloquear IPs abusivas en Nginx
# Añadir a nginx.conf:
deny 1.2.3.4;
```

### 4. HTTPS/SSL

**Configurar SSL con Let's Encrypt:**

```bash
# Instalar certbot
sudo apt-get install certbot

# Obtener certificado
sudo certbot certonly --standalone \
  -d notifications.tu-dominio.com \
  --email tu-email@example.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem nginx/ssl/

# Auto-renovación
sudo crontab -e
# Añadir:
0 3 * * * certbot renew --quiet && docker-compose restart nginx
```

**Forzar HTTPS:**

```nginx
# En nginx.conf
server {
    listen 80;
    server_name notifications.tu-dominio.com;

    # Redirigir todo a HTTPS
    return 301 https://$server_name$request_uri;
}
```

### 5. Firewall

**Configurar firewall (UFW en Ubuntu):**

```bash
# Permitir solo puertos necesarios
sudo ufw allow 80/tcp   # HTTP (redirect a HTTPS)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 22/tcp   # SSH (solo desde IPs confiables)

# Denegar todo lo demás
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Activar firewall
sudo ufw enable

# Ver estado
sudo ufw status verbose
```

**Limitar acceso a PostgreSQL y Redis:**

```bash
# Solo permitir desde localhost
# En docker-compose.yml, remover exposición de puertos:
# postgres:
#   ports:
#     - "5432:5432"  # ← REMOVER en producción

# Los servicios aún pueden comunicarse vía network interna
```

### 6. Docker Security

**Mejores prácticas:**

```dockerfile
# Usar usuario no-root
FROM node:18-alpine
USER node

# No exponer puertos innecesarios
# Solo exponer lo que Nginx necesita

# Actualizar packages
RUN apk update && apk upgrade

# Escanear imágenes
# docker scan zo_notifications_api
```

**Docker Secrets (en Swarm):**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    secrets:
      - redis_password
      - postgres_password

secrets:
  redis_password:
    external: true
  postgres_password:
    external: true
```

### 7. Logging y Auditoría

**No loguear información sensible:**

```javascript
// ❌ MAL
logger.info('User login', { password: req.body.password });

// ✅ BIEN
logger.info('User login', { username: req.body.username });
```

**Monitorear accesos sospechosos:**

```bash
# Ver intentos de acceso con API keys inválidas
docker-compose logs api | grep "Invalid API key"

# Ver IPs que intentan acceso
docker-compose logs api | grep "401" | awk '{print $X}' | sort | uniq -c
```

### 8. Backups Seguros

**Encriptar backups:**

```bash
# Backup con encriptación
docker-compose exec -T postgres pg_dump \
  -U notifier notifications \
  | gzip \
  | openssl enc -aes-256-cbc -salt -pbkdf2 \
    -out backups/backup_encrypted_$(date +%Y%m%d).sql.gz.enc

# Restaurar backup encriptado
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in backups/backup_encrypted_20251113.sql.gz.enc \
  | gunzip \
  | docker-compose exec -T postgres psql -U notifier notifications
```

**Almacenar backups remotamente:**

```bash
# Subir a S3 (o similar)
aws s3 cp backups/backup.sql.gz \
  s3://mi-bucket/zo-notifications/backups/ \
  --sse AES256
```

### 9. Headers de Seguridad

**Verificar headers (ya configurados en Nginx):**

```bash
curl -I https://notifications.tu-dominio.com

# Debe incluir:
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### 10. Dependencias

**Mantener actualizadas:**

```bash
# Escanear vulnerabilidades
npm audit

# Actualizar dependencias
npm update

# Actualizar con precaución
npm audit fix

# Ver outdated packages
npm outdated
```

**Usar Dependabot (GitHub):**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/api"
    schedule:
      interval: "weekly"
```

---

## 🚨 **Checklist de Seguridad**

Antes de ir a producción:

- [ ] SSL/TLS configurado y funcionando
- [ ] Contraseñas fuertes generadas
- [ ] API Keys rotadas desde las de desarrollo
- [ ] Rate limiting configurado
- [ ] Firewall activado
- [ ] Puertos innecesarios cerrados
- [ ] Backups automáticos configurados
- [ ] Backups encriptados
- [ ] Logs monitoreados
- [ ] Dependencias actualizadas
- [ ] Docker images escaneadas
- [ ] Headers de seguridad verificados
- [ ] HTTPS forzado
- [ ] Secretos NO en el código
- [ ] .env en .gitignore
- [ ] Usuario no-root en containers
- [ ] CORS configurado correctamente
- [ ] Validación de inputs activa
- [ ] Health checks funcionando
- [ ] Monitoreo configurado

---

## 🔍 **Monitoreo de Seguridad**

### Logs a revisar regularmente

```bash
# Intentos de acceso no autorizados
docker-compose logs | grep -E "401|403|Invalid|Unauthorized"

# Rate limiting triggers
docker-compose logs | grep "Rate limit exceeded"

# Errores del sistema
docker-compose logs | grep -E "ERROR|CRITICAL"

# Queries sospechosas
docker-compose logs postgres | grep -E "DROP|DELETE FROM|TRUNCATE"
```

### Alertas automáticas

Configurar notificaciones para:
- Intentos de autenticación fallidos repetidos
- Rate limiting excedido frecuentemente
- Disk space > 80%
- Memory usage > 90%
- CPU usage > 90% sostenido
- Backups fallidos

---

## 🛡️ **Incident Response**

Si detectas un problema de seguridad:

1. **Aislar**: Detén el servicio afectado
   ```bash
   docker-compose stop api
   ```

2. **Investigar**: Revisa logs
   ```bash
   docker-compose logs > incident_logs.txt
   ```

3. **Contener**: Cambia credenciales
   ```bash
   # Generar nuevas passwords
   # Rotar API keys
   # Actualizar .env
   ```

4. **Recuperar**: Restaura desde backup limpio
   ```bash
   ./scripts/restore.sh backups/backup_clean.sql.gz
   ```

5. **Documentar**: Escribe post-mortem
   - ¿Qué pasó?
   - ¿Cómo detectaste el problema?
   - ¿Qué hiciste para resolverlo?
   - ¿Cómo prevenir que vuelva a ocurrir?

---

## 📞 **Reportar Vulnerabilidades**

Si encuentras una vulnerabilidad:

1. **NO abras un issue público**
2. Envía email a: security@tu-dominio.com
3. Incluye:
   - Descripción del problema
   - Pasos para reproducir
   - Impacto potencial
   - Sugerencias de mitigación (opcional)

---

**Recuerda**: La seguridad es un proceso continuo, no un estado final.
