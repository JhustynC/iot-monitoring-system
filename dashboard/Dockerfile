# Etapa 1: Construcción
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Servidor de producción
FROM nginx:stable-alpine

# Copiar archivos estáticos desde la etapa de construcción
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración de nginx si fuera necesario (opcional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

