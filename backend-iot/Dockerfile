# Etapa 1: Construccion
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# --legacy-peer-deps porque @nestjs/platform-socket.io v11 y otras deps
# reportan conflictos que no son reales en tiempo de ejecucion.
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Etapa 2: Produccion
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
EXPOSE 3002
CMD ["node", "dist/main.js"]
