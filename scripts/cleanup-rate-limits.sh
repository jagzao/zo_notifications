#!/bin/bash

# Script para limpiar datos antiguos de rate limiting
# Ejecutar como cron job cada hora

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo -e "${BLUE}[${TIMESTAMP}] Iniciando limpieza de rate limits...${NC}"

# Verificar que PostgreSQL está corriendo
if ! docker ps | grep -q zo_postgres; then
  echo -e "${RED}[${TIMESTAMP}] ERROR: PostgreSQL no está corriendo${NC}"
  exit 1
fi

# Ejecutar limpieza (datos > 24 horas)
RESULT=$(docker exec zo_postgres psql -U ${POSTGRES_USER:-notifier} -d ${POSTGRES_DB:-notifications} -t -c "
  SELECT cleanup_old_rate_limits();
" 2>&1)

if [ $? -eq 0 ]; then
  echo -e "${GREEN}[${TIMESTAMP}] ✅ Limpieza completada${NC}"
  
  # Obtener estadísticas actuales
  STATS=$(docker exec zo_postgres psql -U ${POSTGRES_USER:-notifier} -d ${POSTGRES_DB:-notifications} -t -c "
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT api_key) as unique_keys,
      pg_size_pretty(pg_total_relation_size('rate_limit_usage')) as table_size
    FROM rate_limit_usage;
  ")
  
  echo -e "${BLUE}[${TIMESTAMP}] Estadísticas actuales:${NC}"
  echo "$STATS"
  
  # Log a archivo
  echo "[${TIMESTAMP}] Rate limit cleanup completed - $STATS" >> /var/log/zo_notifications_cleanup.log
else
  echo -e "${RED}[${TIMESTAMP}] ❌ Error en limpieza: $RESULT${NC}"
  exit 1
fi
