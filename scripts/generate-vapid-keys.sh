#!/bin/bash

# Script para generar VAPID keys para Web Push
# ============================================

echo "🔑 Generando VAPID keys para Web Push..."
echo ""

# Verificar si web-push está instalado
if ! command -v web-push &> /dev/null; then
    echo "❌ web-push no está instalado"
    echo ""
    echo "Instalando web-push globalmente..."
    npm install -g web-push

    if [ $? -ne 0 ]; then
        echo "❌ Error instalando web-push"
        exit 1
    fi
fi

echo "Generando keys..."
echo ""

# Generar keys
keys=$(web-push generate-vapid-keys)

echo "✅ Keys generadas:"
echo ""
echo "$keys"
echo ""
echo "📝 Copia estas keys a tu archivo .env:"
echo ""
echo "$keys" | grep "Public Key" | sed 's/Public Key:/WEB_PUSH_PUBLIC_KEY=/'
echo "$keys" | grep "Private Key" | sed 's/Private Key:/WEB_PUSH_PRIVATE_KEY=/'
echo ""
echo "También añade:"
echo "WEB_PUSH_EMAIL=tu-email@example.com"
