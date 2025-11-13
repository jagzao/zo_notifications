#!/bin/bash

# Script para limpiar DLQ antiguos (> 7 días en Redis)
# Los jobs críticos deberían estar en backups

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo -e "${BLUE}[${TIMESTAMP}] Limpieza de DLQ antiguos...${NC}"

# Verificar que Redis está corriendo
if ! docker ps | grep -q zo_redis; then
  echo -e "${RED}[${TIMESTAMP}] ERROR: Redis no está corriendo${NC}"
  exit 1
fi

# Este script se ejecuta semanalmente para limpiar DLQ
# Los jobs ya deberían estar en backups (se hace cada 6h)

QUEUES=("webpush-notifications:dlq" "discord-notifications:dlq" "slack-notifications:dlq" "email-notifications:dlq")

for QUEUE in "${QUEUES[@]}"; do
  # Obtener conteo antes
  BEFORE=$(docker exec zo_redis redis-cli -a "${REDIS_PASSWORD}" --no-auth-warning LLEN "$QUEUE" 2>/dev/null || echo "0")
  
  if [ "$BEFORE" -gt 0 ]; then
    echo -e "${YELLOW}[${TIMESTAMP}] $QUEUE tiene $BEFORE jobs${NC}"
    
    # Aquí podrías implementar lógica más sofisticada
    # Por ahora solo reportamos, no borramos (los jobs expiran solos en Redis)
    echo -e "${BLUE}[${TIMESTAMP}] Jobs serán limpiados por TTL de Redis (7 días)${NC}"
  else
    echo -e "${GREEN}[${TIMESTAMP}] $QUEUE está vacío${NC}"
  fi
done

echo -e "${GREEN}[${TIMESTAMP}] ✅ Verificación completada${NC}"
