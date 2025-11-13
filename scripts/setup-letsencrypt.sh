#!/bin/bash

# Script para configurar Let's Encrypt SSL/TLS con certbot
# Requiere: certbot instalado y dominio apuntando al servidor

set -e

echo "================================================"
echo "Setup de Let's Encrypt SSL/TLS"
echo "================================================"
echo ""

# Verificar que certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "❌ certbot no está instalado"
    echo ""
    echo "Instala certbot con:"
    echo "  Ubuntu/Debian: sudo apt-get install certbot"
    echo "  CentOS/RHEL: sudo yum install certbot"
    echo "  macOS: brew install certbot"
    echo ""
    exit 1
fi

echo "✅ certbot encontrado"
echo ""

# Solicitar información
read -p "Dominio (ej: notifications.tu-dominio.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Dominio es requerido"
    exit 1
fi

read -p "Email para notificaciones (requerido por Let's Encrypt): " EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ Email es requerido"
    exit 1
fi

echo ""
echo "Verificando que el dominio apunta a este servidor..."

# Obtener IP pública del servidor
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "unknown")

# Resolver dominio
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ -z "$DOMAIN_IP" ]; then
    echo "⚠️  No se pudo resolver el dominio $DOMAIN"
    read -p "¿Continuar de todas formas? [y/N]: " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        exit 1
    fi
elif [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo "⚠️  Advertencia: El dominio $DOMAIN apunta a $DOMAIN_IP"
    echo "   pero la IP del servidor es $SERVER_IP"
    read -p "¿Continuar de todas formas? [y/N]: " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Dominio apunta correctamente al servidor"
fi

echo ""
echo "================================================"
echo "Método de validación"
echo "================================================"
echo ""
echo "1. Standalone (detiene servicios temporalmente)"
echo "2. Webroot (requiere Nginx corriendo)"
echo ""
read -p "Selecciona método [1/2]: " METHOD

SSL_DIR="nginx/ssl"
mkdir -p "$SSL_DIR"

if [ "$METHOD" = "1" ]; then
    echo ""
    echo "Obteniendo certificado con método standalone..."
    echo "Esto detendrá temporalmente el servidor web..."
    echo ""

    # Detener Nginx si está corriendo
    docker-compose stop nginx 2>/dev/null || true

    # Obtener certificado
    sudo certbot certonly \
        --standalone \
        --preferred-challenges http \
        -d "$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive

elif [ "$METHOD" = "2" ]; then
    echo ""
    echo "Obteniendo certificado con método webroot..."
    echo ""

    # Crear webroot si no existe
    WEBROOT="/var/www/letsencrypt"
    sudo mkdir -p "$WEBROOT"

    # Obtener certificado
    sudo certbot certonly \
        --webroot \
        -w "$WEBROOT" \
        -d "$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive

else
    echo "❌ Método inválido"
    exit 1
fi

# Copiar certificados al directorio del proyecto
echo ""
echo "Copiando certificados..."

sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
sudo chown $USER:$USER "$SSL_DIR/fullchain.pem" "$SSL_DIR/privkey.pem"
sudo chmod 644 "$SSL_DIR/fullchain.pem"
sudo chmod 600 "$SSL_DIR/privkey.pem"

echo "✅ Certificados copiados a $SSL_DIR"

# Configurar auto-renovación
echo ""
echo "Configurando auto-renovación..."

# Crear script de renovación
sudo tee /etc/cron.d/certbot-renewal-zo-notifications > /dev/null <<EOF
# Renovar certificados Let's Encrypt y reiniciar Nginx
0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/$DOMAIN/*.pem $(pwd)/$SSL_DIR/ && docker-compose -f $(pwd)/docker-compose.prod.yml restart nginx"
EOF

echo "✅ Auto-renovación configurada (cron diario a las 3 AM)"

# Reiniciar Nginx
echo ""
echo "Reiniciando Nginx..."
docker-compose -f docker-compose.prod.yml restart nginx

echo ""
echo "================================================"
echo "✅ Let's Encrypt configurado exitosamente"
echo "================================================"
echo ""
echo "Certificados instalados para: $DOMAIN"
echo "Auto-renovación: Configurada (cada día a las 3 AM)"
echo ""
echo "Próximos pasos:"
echo "  1. Verifica que Nginx está corriendo: docker-compose ps"
echo "  2. Prueba HTTPS: https://$DOMAIN"
echo "  3. Verifica SSL: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "Para renovar manualmente:"
echo "  sudo certbot renew"
echo ""
