FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código de la aplicación
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]