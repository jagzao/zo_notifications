#!/bin/bash

# Script de validación de entorno para ZO Notifications
# Verifica que todas las variables críticas estén configuradas

set -e

echo "================================================"
echo "ZO Notifications - Validación de Entorno"
echo "================================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Función para verificar variable requerida
check_required() {
  local var_name=$1
  local var_value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'")

  if [ -z "$var_value" ] || [ "$var_value" = "change-this-" ] || [ "$var_value" = "YOUR_" ]; then
    echo -e "${RED}❌ FALTA: $var_name${NC}"
    ERRORS=$((ERRORS + 1))
    return 1
  else
    echo -e "${GREEN}✅ OK: $var_name${NC}"
    return 0
  fi
}

# Función para verificar variable opcional
check_optional() {
  local var_name=$1
  local var_value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'")

  if [ -z "$var_value" ]; then
    echo -e "${YELLOW}⚠️  OPCIONAL: $var_name (no configurado)${NC}"
    WARNINGS=$((WARNINGS + 1))
    return 1
  else
    echo -e "${GREEN}✅ OK: $var_name${NC}"
    return 0
  fi
}

# Verificar que existe .env
echo "1. Verificando archivo .env..."
if [ ! -f .env ]; then
  echo -e "${RED}❌ ERROR: Archivo .env no encontrado${NC}"
  echo ""
  echo "Crea uno con:"
  echo "  cp .env.example .env"
  echo "  nano .env"
  exit 1
fi
echo -e "${GREEN}✅ Archivo .env existe${NC}"
echo ""

# Verificar variables críticas
echo "2. Verificando variables CRÍTICAS..."
echo "───────────────────────────────────────"

check_required "API_KEY_SECRET"
check_required "REDIS_PASSWORD"
check_required "POSTGRES_PASSWORD"
check_required "POSTGRES_DB"
check_required "POSTGRES_USER"

echo ""

# Verificar Web Push
echo "3. Verificando configuración de Web Push..."
echo "───────────────────────────────────────"

if check_required "WEB_PUSH_PUBLIC_KEY" && check_required "WEB_PUSH_PRIVATE_KEY"; then
  echo -e "${GREEN}✅ Web Push configurado${NC}"
else
  echo -e "${YELLOW}⚠️  Para generar keys:${NC}"
  echo "    npm install -g web-push"
  echo "    web-push generate-vapid-keys"
fi

echo ""

# Verificar Discord
echo "4. Verificando configuración de Discord..."
echo "───────────────────────────────────────"

if check_optional "DISCORD_WEBHOOK_URL"; then
  echo -e "${GREEN}✅ Discord configurado${NC}"
else
  echo -e "${YELLOW}⚠️  Discord no configurado (opcional)${NC}"
  echo "    Crear en: Server Settings → Integrations → Webhooks"
fi

echo ""

# Verificar Slack
echo "5. Verificando configuración de Slack..."
echo "───────────────────────────────────────"

if check_optional "SLACK_WEBHOOK_URL"; then
  echo -e "${GREEN}✅ Slack configurado${NC}"
else
  echo -e "${YELLOW}⚠️  Slack no configurado (opcional)${NC}"
  echo "    Crear en: https://api.slack.com/messaging/webhooks"
fi

echo ""

# Verificar Email
echo "6. Verificando configuración de Email..."
echo "───────────────────────────────────────"

if check_optional "EMAIL_USER" && check_optional "EMAIL_PASSWORD" && check_optional "EMAIL_TO"; then
  echo -e "${GREEN}✅ Email configurado${NC}"
else
  echo -e "${YELLOW}⚠️  Email no configurado (opcional)${NC}"
  echo "    Para Gmail: https://support.google.com/accounts/answer/185833"
fi

echo ""

# Verificar Grafana
echo "7. Verificando configuración de Grafana..."
echo "───────────────────────────────────────"

check_optional "GRAFANA_ADMIN_USER"
check_optional "GRAFANA_ADMIN_PASSWORD"

echo ""

# Verificar Docker
echo "8. Verificando Docker..."
echo "───────────────────────────────────────"

if command -v docker &> /dev/null; then
  echo -e "${GREEN}✅ Docker instalado${NC}"
  docker --version
else
  echo -e "${RED}❌ Docker no encontrado${NC}"
  ERRORS=$((ERRORS + 1))
fi

if command -v docker-compose &> /dev/null; then
  echo -e "${GREEN}✅ Docker Compose instalado${NC}"
  docker-compose --version
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
  echo -e "${GREEN}✅ Docker Compose (plugin) instalado${NC}"
  docker compose version
else
  echo -e "${RED}❌ Docker Compose no encontrado${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Verificar puertos disponibles
echo "9. Verificando puertos disponibles..."
echo "───────────────────────────────────────"

check_port() {
  local port=$1
  local service=$2

  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$port "; then
    echo -e "${YELLOW}⚠️  Puerto $port ya está en uso (necesario para $service)${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ Puerto $port disponible ($service)${NC}"
  fi
}

check_port 3000 "API"
check_port 5173 "Frontend"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

echo ""

# Verificar estructura de directorios
echo "10. Verificando estructura de directorios..."
echo "───────────────────────────────────────"

REQUIRED_DIRS=(
  "api"
  "frontend"
  "workers/webpush-worker"
  "workers/discord-worker"
  "workers/slack-worker"
  "workers/email-worker"
  "database/migrations"
  "scripts"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✅ $dir${NC}"
  else
    echo -e "${RED}❌ FALTA: $dir${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "================================================"
echo "RESUMEN"
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ TODO PERFECTO - Listo para iniciar${NC}"
  echo ""
  echo "Siguiente paso:"
  echo "  docker-compose up -d"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  ${WARNINGS} advertencia(s)${NC}"
  echo ""
  echo "Puedes continuar, pero algunas features no funcionarán:"
  echo "  - Sin Discord: No se enviarán notificaciones a Discord"
  echo "  - Sin Slack: No se enviarán notificaciones a Slack"
  echo "  - Sin Email: No se enviarán notificaciones por email"
  echo ""
  echo "¿Iniciar de todas formas? (y/n)"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Iniciando..."
    exit 0
  else
    echo "Abortado. Configura las variables opcionales en .env"
    exit 1
  fi
else
  echo -e "${RED}❌ ${ERRORS} error(es) crítico(s)${NC}"
  echo -e "${YELLOW}⚠️  ${WARNINGS} advertencia(s)${NC}"
  echo ""
  echo "DEBES solucionar los errores críticos antes de continuar."
  echo "Edita el archivo .env con:"
  echo "  nano .env"
  exit 1
fi
