#!/bin/bash

# Script para detener ZO Notifications
# ====================================

echo "🛑 Deteniendo ZO Notifications..."

# Detener servicios
docker-compose down

echo "✅ Servicios detenidos"
echo ""
echo "Para eliminar también los volúmenes (⚠️  esto borra la base de datos):"
echo "  docker-compose down -v"
