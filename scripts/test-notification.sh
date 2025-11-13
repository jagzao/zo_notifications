#!/bin/bash

# Script para enviar notificaciones de prueba
# ===========================================

API_URL="${API_URL:-http://localhost:3000/api/v1}"
API_KEY="${API_KEY:-test-key-change-this-in-production}"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🧪 Enviando notificaciones de prueba a ZO Notifications"
echo ""

# Función para enviar y mostrar resultado
send_notification() {
    local type=$1
    local data=$2
    local emoji=$3

    echo -n "$emoji Enviando notificación de $type... "

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/notify/$type" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "$data")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        echo "   Respuesta: $body"
    else
        echo -e "${RED}❌ Error (HTTP $http_code)${NC}"
        echo "   $body"
    fi
    echo ""
}

# Test 1: Success
send_notification "success" '{
  "project": "test-suite",
  "title": "Notificación de prueba - Éxito",
  "message": "Esta es una notificación de éxito de prueba",
  "metadata": {
    "test": true,
    "timestamp": "'$(date -Iseconds)'"
  }
}' "✅"

# Test 2: Error
send_notification "error" '{
  "project": "test-suite",
  "title": "Notificación de prueba - Error",
  "error": {
    "message": "Este es un error de prueba",
    "stack": "Error: Test error\n  at testFunction (test.js:10:5)\n  at main (test.js:20:3)",
    "severity": "medium",
    "code": "TEST_ERROR"
  },
  "context": {
    "test": true,
    "endpoint": "/api/test",
    "method": "GET"
  }
}' "❌"

# Test 3: Warning
send_notification "warning" '{
  "project": "test-suite",
  "title": "Notificación de prueba - Advertencia",
  "message": "Esta es una advertencia de prueba",
  "metadata": {
    "test": true,
    "warning_type": "performance"
  }
}' "⚠️"

# Test 4: Info
send_notification "info" '{
  "project": "test-suite",
  "title": "Notificación de prueba - Info",
  "message": "Esta es una notificación informativa de prueba",
  "metadata": {
    "test": true,
    "info_type": "status"
  }
}' "ℹ️"

echo ""
echo -e "${BLUE}📊 Estadísticas:${NC}"
curl -s "$API_URL/stats?period=24h" \
    -H "X-API-Key: $API_KEY" | jq '.' || echo "Error obteniendo stats"

echo ""
echo -e "${GREEN}✨ Pruebas completadas${NC}"
echo "Revisa tu dashboard en http://localhost:5173"
echo "Y verifica Discord para ver los mensajes de error"
