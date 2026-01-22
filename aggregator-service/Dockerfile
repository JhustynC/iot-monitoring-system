# Etapa 1: Construcción
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Etapa 2: Ejecución
FROM node:20-alpine

WORKDIR /app

# Copiar solo lo necesario para producción
COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist

# Usuario no root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["npm", "start"]

