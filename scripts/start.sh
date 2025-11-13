#!/bin/bash

# Script para iniciar ZO Notifications con workers condicionales
# Detecta automáticamente qué workers están configurados y solo levanta esos

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ZO Notifications - Smart Startup    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Cargar variables de entorno
if [ ! -f .env ]; then
  echo -e "${RED}❌ ERROR: .env file not found!${NC}"
  echo "Run: cp .env.example .env"
  exit 1
fi

source .env

# Detectar compose file (dev o prod)
COMPOSE_FILE="docker-compose.yml"
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  echo -e "${BLUE}📦 Modo: PRODUCCIÓN${NC}"
else
  echo -e "${BLUE}📦 Modo: DESARROLLO${NC}"
fi

# Array para profiles activos
PROFILES=()

# Verificar configuración de cada worker
echo -e "\n${BLUE}Detectando workers configurados...${NC}\n"

# WebPush (siempre activo - es el core del sistema)
echo -e "${GREEN}✅ WebPush Worker${NC} - Siempre activo (core)"

# Discord
if [ ! -z "$DISCORD_WEBHOOK_URL" ] && [ "$DISCORD_WEBHOOK_URL" != "your_discord_webhook_url" ]; then
  echo -e "${GREEN}✅ Discord Worker${NC} - Configurado"
  PROFILES+=("discord")
else
  echo -e "${YELLOW}⏭️  Discord Worker${NC} - No configurado (saltando)"
fi

# Slack
if [ ! -z "$SLACK_WEBHOOK_URL" ] && [ "$SLACK_WEBHOOK_URL" != "your_slack_webhook_url" ]; then
  echo -e "${GREEN}✅ Slack Worker${NC} - Configurado"
  PROFILES+=("slack")
else
  echo -e "${YELLOW}⏭️  Slack Worker${NC} - No configurado (saltando)"
fi

# Email
if [ ! -z "$EMAIL_USER" ] && [ "$EMAIL_USER" != "your_email@gmail.com" ]; then
  echo -e "${GREEN}✅ Email Worker${NC} - Configurado"
  PROFILES+=("email")
else
  echo -e "${YELLOW}⏭️  Email Worker${NC} - No configurado (saltando)"
fi

# Construir comando docker-compose
CMD="docker-compose -f $COMPOSE_FILE"

# Añadir profiles si hay
if [ ${#PROFILES[@]} -gt 0 ]; then
  PROFILE_STR=$(IFS=,; echo "${PROFILES[*]}")
  CMD="COMPOSE_PROFILES=$PROFILE_STR $CMD"
  echo -e "\n${BLUE}🎯 Profiles activos: ${PROFILE_STR}${NC}"
else
  echo -e "\n${BLUE}🎯 Solo workers core (WebPush)${NC}"
fi

# Preguntar acción
echo -e "\n${BLUE}¿Qué quieres hacer?${NC}"
echo "1) up    - Iniciar en background"
echo "2) logs  - Ver logs en tiempo real"
echo "3) down  - Detener todo"
echo "4) build - Rebuild images"
echo "5) ps    - Ver estado de contenedores"
echo ""
read -p "Opción [1]: " ACTION
ACTION=${ACTION:-1}

case $ACTION in
  1|up)
    echo -e "\n${GREEN}🚀 Iniciando servicios...${NC}"
    eval "$CMD up -d"
    echo -e "\n${GREEN}✅ Servicios iniciados!${NC}"
    echo -e "\n${BLUE}Servicios disponibles:${NC}"
    echo "  - API:      http://localhost:3000"
    echo "  - Frontend: http://localhost:5173"
    if [ "$COMPOSE_FILE" = "docker-compose.prod.yml" ]; then
      echo "  - Grafana:  http://localhost:3001 (admin/admin)"
      echo "  - Prometheus: http://localhost:9090"
      echo "  - Uptime Kuma: http://localhost:3002"
    fi
    echo ""
    echo "Ver logs: ./scripts/start.sh logs"
    ;;
  2|logs)
    echo -e "\n${GREEN}📋 Mostrando logs...${NC}"
    eval "$CMD logs -f"
    ;;
  3|down)
    echo -e "\n${YELLOW}🛑 Deteniendo servicios...${NC}"
    eval "$CMD down"
    echo -e "${GREEN}✅ Servicios detenidos${NC}"
    ;;
  4|build)
    echo -e "\n${BLUE}🔨 Rebuilding images...${NC}"
    eval "$CMD build"
    echo -e "${GREEN}✅ Build completado${NC}"
    ;;
  5|ps)
    echo -e "\n${BLUE}📊 Estado de contenedores:${NC}\n"
    eval "$CMD ps"
    ;;
  *)
    echo -e "${RED}❌ Opción inválida${NC}"
    exit 1
    ;;
esac
