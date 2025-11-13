FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código
COPY . .

# Crear directorio de logs
RUN mkdir -p /app/logs

# Usuario no-root para seguridad
USER node

# Comando de inicio
CMD ["node", "index.js"]
