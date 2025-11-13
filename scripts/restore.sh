#!/bin/bash

# Script de restauración de backup
# =================================
# Uso: ./scripts/restore.sh <backup_file>

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Debes especificar un archivo de backup"
    echo "Uso: $0 <backup_file>"
    echo ""
    echo "Backups disponibles:"
    ls -lh backups/*.sql.gz 2>/dev/null || echo "  No hay backups disponibles"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Archivo de backup no encontrado: $BACKUP_FILE"
    exit 1
fi

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  ADVERTENCIA: Esto sobrescribirá la base de datos actual${NC}"
echo "Backup a restaurar: $BACKUP_FILE"
echo ""
read -p "¿Estás seguro? (escribe 'yes' para continuar): " -r
if [[ ! $REPLY = "yes" ]]; then
    echo "Operación cancelada"
    exit 0
fi

# Obtener credenciales de .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}❌ Archivo .env no encontrado${NC}"
    exit 1
fi

echo ""
echo "📥 Restaurando backup..."

# Detener workers para evitar conflictos
echo "🛑 Deteniendo workers..."
docker-compose stop webpush-worker discord-worker

# Restaurar backup
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup restaurado exitosamente${NC}"

    # Reiniciar workers
    echo "🔄 Reiniciando workers..."
    docker-compose start webpush-worker discord-worker

    echo ""
    echo -e "${GREEN}✨ Restauración completada${NC}"
else
    echo -e "${RED}❌ Error al restaurar backup${NC}"

    # Reiniciar workers de todas formas
    docker-compose start webpush-worker discord-worker

    exit 1
fi
