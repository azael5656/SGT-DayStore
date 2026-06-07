# Etapa 1: Construccion del bundle de produccion
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 1b: Dev (Vite dev server con HMR).
# Usada por docker-compose.dev.yml. El codigo fuente entra por bind-mount,
# por eso aqui solo instalamos deps y no copiamos el resto.
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Etapa 2: Servir el bundle estatico con nginx
FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
