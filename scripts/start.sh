#!/bin/bash

# Script de inicio rápido para ZO Notifications
# ============================================

set -e

echo "🚀 Iniciando ZO Notifications..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo "Por favor instala Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    echo "Por favor instala Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker encontrado${NC}"

# Verificar archivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
    echo "Copiando .env.example a .env..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Por favor edita el archivo .env con tus configuraciones${NC}"
    echo ""
    echo "Debes configurar:"
    echo "  - WEB_PUSH_PUBLIC_KEY y WEB_PUSH_PRIVATE_KEY (generar con: web-push generate-vapid-keys)"
    echo "  - DISCORD_WEBHOOK_URL"
    echo "  - API_KEY_SECRET"
    echo "  - REDIS_PASSWORD"
    echo "  - POSTGRES_PASSWORD"
    echo ""
    read -p "¿Ya configuraste el archivo .env? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Por favor configura .env y vuelve a ejecutar este script"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Archivo .env encontrado${NC}"

# Verificar Web Push keys
if ! grep -q "WEB_PUSH_PUBLIC_KEY=BC" .env; then
    echo -e "${YELLOW}⚠️  Web Push keys no configuradas${NC}"
    echo ""
    echo "Para generar las keys:"
    echo "  npm install -g web-push"
    echo "  web-push generate-vapid-keys"
    echo ""
    read -p "¿Quieres continuar sin Web Push? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Construir e iniciar servicios
echo ""
echo "📦 Construyendo imágenes Docker..."
docker-compose build

echo ""
echo "🏃 Iniciando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 5

# Verificar estado
echo ""
echo "📊 Estado de los servicios:"
docker-compose ps

# Verificar health del API
echo ""
echo "🏥 Verificando health del API..."
for i in {1..10}; do
    if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API está respondiendo${NC}"
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ API no responde después de 10 intentos${NC}"
            echo "Ver logs: docker-compose logs api"
            exit 1
        fi
        echo "Intento $i/10..."
        sleep 2
    fi
done

# Mostrar información
echo ""
echo -e "${GREEN}✨ ¡ZO Notifications está corriendo!${NC}"
echo ""
echo "📍 URLs disponibles:"
echo "   - Dashboard:  http://localhost:5173"
echo "   - API:        http://localhost:3000"
echo "   - Health:     http://localhost:3000/api/v1/health"
echo ""
echo "📝 Comandos útiles:"
echo "   - Ver logs:        docker-compose logs -f"
echo "   - Detener:         docker-compose down"
echo "   - Reiniciar:       docker-compose restart"
echo ""
echo "📚 Documentación:"
echo "   - DEPLOYMENT.md - Guía de despliegue completa"
echo "   - EXAMPLES.md   - Ejemplos de uso"
echo "   - docs/API.md   - Documentación de API"
echo ""
echo -e "${YELLOW}💡 Tip: Abre http://localhost:5173 y activa las notificaciones del navegador${NC}"
