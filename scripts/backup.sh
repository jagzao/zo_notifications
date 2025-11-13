#!/bin/bash

# Script de backup automático para PostgreSQL
# ===========================================
# Uso: ./scripts/backup.sh
# O configurar en cron: 0 2 * * * /path/to/backup.sh

set -e

# Configuración
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/zo_notifications_$DATE.sql.gz"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🗄️  Iniciando backup de ZO Notifications${NC}"
echo "Fecha: $(date)"
echo ""

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Obtener credenciales de .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}❌ Archivo .env no encontrado${NC}"
    exit 1
fi

# Realizar backup
echo "📦 Creando backup..."
docker-compose exec -T postgres pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-acl \
    | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup completado: $BACKUP_FILE${NC}"
    echo "   Tamaño: $BACKUP_SIZE"

    # Enviar notificación de éxito
    if command -v curl &> /dev/null; then
        curl -s -X POST http://localhost:3000/api/v1/notify/success \
            -H "Content-Type: application/json" \
            -H "X-API-Key: ${API_KEY_SECRET}" \
            -d "{
                \"project\": \"zo-notifications\",
                \"title\": \"Backup completado\",
                \"message\": \"Backup de base de datos completado exitosamente\",
                \"metadata\": {
                    \"file\": \"$BACKUP_FILE\",
                    \"size\": \"$BACKUP_SIZE\",
                    \"timestamp\": \"$(date -Iseconds)\"
                }
            }" > /dev/null 2>&1
    fi
else
    echo -e "${RED}❌ Error al crear backup${NC}"

    # Enviar notificación de error
    if command -v curl &> /dev/null; then
        curl -s -X POST http://localhost:3000/api/v1/notify/error \
            -H "Content-Type: application/json" \
            -H "X-API-Key: ${API_KEY_SECRET}" \
            -d "{
                \"project\": \"zo-notifications\",
                \"title\": \"Error en backup\",
                \"error\": {
                    \"message\": \"Falló el backup de la base de datos\",
                    \"severity\": \"critical\"
                }
            }" > /dev/null 2>&1
    fi

    exit 1
fi

# Limpiar backups antiguos
echo ""
echo "🧹 Limpiando backups antiguos (más de $RETENTION_DAYS días)..."
find "$BACKUP_DIR" -name "zo_notifications_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "zo_notifications_*.sql.gz" -type f | wc -l)
echo "   Backups restantes: $REMAINING"

echo ""
echo -e "${GREEN}✨ Backup completado exitosamente${NC}"
echo ""
echo "📋 Comandos útiles:"
echo "   Listar backups:   ls -lh $BACKUP_DIR"
echo "   Restaurar backup: ./scripts/restore.sh $BACKUP_FILE"
