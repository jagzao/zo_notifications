#!/bin/bash

# Script para generar certificados SSL self-signed para desarrollo/testing
# Para producción, se recomienda usar Let's Encrypt

set -e

echo "================================================"
echo "Generador de Certificados SSL Self-Signed"
echo "================================================"
echo ""
echo "⚠️  ADVERTENCIA: Estos certificados son solo para desarrollo/testing"
echo "    Para producción, usa Let's Encrypt con certbot"
echo ""

# Directorio de SSL
SSL_DIR="nginx/ssl"

# Crear directorio si no existe
mkdir -p "$SSL_DIR"

# Solicitar información
read -p "Dominio o IP (default: localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

read -p "País (código de 2 letras, default: ES): " COUNTRY
COUNTRY=${COUNTRY:-ES}

read -p "Estado/Provincia (default: Madrid): " STATE
STATE=${STATE:-Madrid}

read -p "Ciudad (default: Madrid): " CITY
CITY=${CITY:-Madrid}

read -p "Organización (default: ZO Notifications): " ORG
ORG=${ORG:-ZO Notifications}

read -p "Días de validez (default: 365): " DAYS
DAYS=${DAYS:-365}

echo ""
echo "Generando certificados SSL..."
echo "  Dominio: $DOMAIN"
echo "  País: $COUNTRY"
echo "  Estado: $STATE"
echo "  Ciudad: $CITY"
echo "  Organización: $ORG"
echo "  Validez: $DAYS días"
echo ""

# Generar clave privada
openssl genrsa -out "$SSL_DIR/privkey.pem" 2048

echo "✅ Clave privada generada"

# Generar certificado
openssl req -new -x509 \
  -key "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -days $DAYS \
  -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=$DOMAIN"

echo "✅ Certificado generado"

# Crear archivo DH params para mayor seguridad (opcional, puede tardar)
read -p "¿Generar Diffie-Hellman params? (mejora seguridad pero tarda ~5 min) [y/N]: " GENERATE_DH
if [[ $GENERATE_DH =~ ^[Yy]$ ]]; then
  echo "Generando DH params (esto puede tardar varios minutos)..."
  openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
  echo "✅ DH params generados"
fi

# Establecer permisos
chmod 600 "$SSL_DIR/privkey.pem"
chmod 644 "$SSL_DIR/fullchain.pem"

echo ""
echo "================================================"
echo "✅ Certificados SSL generados exitosamente"
echo "================================================"
echo ""
echo "Archivos creados en $SSL_DIR:"
echo "  - privkey.pem (clave privada)"
echo "  - fullchain.pem (certificado)"
if [[ $GENERATE_DH =~ ^[Yy]$ ]]; then
  echo "  - dhparam.pem (DH parameters)"
fi
echo ""
echo "Para usar los certificados:"
echo "  1. Habilita Nginx en docker-compose.prod.yml"
echo "  2. Reinicia: docker-compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "📝 NOTA: Los navegadores mostrarán advertencia de seguridad"
echo "   porque el certificado es self-signed. Para producción,"
echo "   usa Let's Encrypt (scripts/setup-letsencrypt.sh)"
echo ""
