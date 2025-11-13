FROM node:18-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Exponer puerto de desarrollo
EXPOSE 5173

# Comando para desarrollo (con hot reload)
CMD ["npm", "run", "dev"]
