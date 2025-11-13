#!/bin/bash

# Script para backup de Dead Letter Queue
# Guarda jobs fallidos críticos para debugging y auditoría

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración
BACKUP_DIR="${BACKUP_DIR:-./backups/dlq}"
MAX_BACKUPS="${MAX_BACKUPS:-30}"  # Mantener 30 backups (5 días si se corre cada 6h)
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/dlq_backup_${TIMESTAMP}.json"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      DLQ Backup - ZO Notifications    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Verificar que Redis está corriendo
if ! docker ps | grep -q zo_redis; then
  echo -e "${RED}❌ ERROR: Redis no está corriendo${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Extrayendo DLQ de Redis...${NC}"

# Extraer DLQ de todos los canales
DLQ_DATA=$(cat <<'SCRIPT'
const { Redis } = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

const queues = [
  'webpush-notifications:dlq',
  'discord-notifications:dlq',
  'slack-notifications:dlq',
  'email-notifications:dlq'
];

async function backupDLQ() {
  const backup = {
    timestamp: new Date().toISOString(),
    queues: {}
  };

  for (const queueKey of queues) {
    const jobs = await redis.lrange(queueKey, 0, -1);
    backup.queues[queueKey] = {
      count: jobs.length,
      jobs: jobs.map(j => JSON.parse(j))
    };
  }

  console.log(JSON.stringify(backup, null, 2));
  await redis.quit();
}

backupDLQ().catch(console.error);
SCRIPT
)

# Ejecutar script en contenedor
docker exec zo_redis sh -c "apk add --no-cache nodejs npm > /dev/null 2>&1 || true"
DLQ_BACKUP=$(docker exec -e REDIS_PASSWORD="${REDIS_PASSWORD}" zo_api node -e "$DLQ_DATA" 2>/dev/null || echo '{"error": "Failed to extract DLQ"}')

# Guardar backup
echo "$DLQ_BACKUP" > "$BACKUP_FILE"

# Verificar que el backup tiene datos
TOTAL_JOBS=$(echo "$DLQ_BACKUP" | grep -o '"count":[0-9]*' | awk -F: '{sum+=$2} END {print sum}')

if [ -z "$TOTAL_JOBS" ]; then
  TOTAL_JOBS=0
fi

echo -e "${GREEN}✅ Backup guardado: ${BACKUP_FILE}${NC}"
echo -e "${BLUE}📊 Total jobs en DLQ: ${TOTAL_JOBS}${NC}"

# Comprimir si tiene datos
if [ "$TOTAL_JOBS" -gt 0 ]; then
  gzip -f "$BACKUP_FILE"
  echo -e "${GREEN}✅ Backup comprimido: ${BACKUP_FILE}.gz${NC}"
  BACKUP_FILE="${BACKUP_FILE}.gz"
fi

# Limpiar backups antiguos
echo -e "${BLUE}🧹 Limpiando backups antiguos (mantener últimos ${MAX_BACKUPS})...${NC}"
ls -t "$BACKUP_DIR"/dlq_backup_*.json* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f

REMAINING=$(ls -1 "$BACKUP_DIR"/dlq_backup_*.json* 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Backups actuales: ${REMAINING}${NC}"

# Estadísticas
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${BLUE}📦 Tamaño del backup: ${SIZE}${NC}"
fi

echo ""
echo -e "${GREEN}✅ Backup completado exitosamente${NC}"

# Log a archivo
echo "[$(date '+%Y-%m-%d %H:%M:%S')] DLQ backup completed - $TOTAL_JOBS jobs backed up" >> /var/log/zo_notifications_backup.log
