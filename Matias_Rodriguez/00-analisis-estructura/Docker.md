---
title: Docker
tags:
  - arquitectura
  - infraestructura
  - devops
aliases:
  - Contenedores
  - Docker Compose
cssclasses:
  - tech-doc
---

# Docker

Plataforma de contenedores para empaquetar, distribuir y ejecutar la aplicación de forma reproducible.

## Estructura del Proyecto

```
bot-discord/
├── Dockerfile
├── docker-compose.yml
├── .env
├── .dockerignore
└── src/
```

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
CMD ["node", "dist/main.js"]
```

## Docker Compose

```yaml
services:
  bot:
    build: .
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: discord_bot
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d discord_bot"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Comandos Útiles

```bash
# Construir y levantar
docker compose up --build -d

# Ver logs
docker compose logs -f bot

# Detener
docker compose down

# Reset total (incluye volúmenes)
docker compose down -v
```

## Referencias

- [[Arquitectura Bot Discord#Infraestructura y Despliegue]]
- [[PostgreSQL]] — base de datos que corre en contenedor
- [[Dockerizar y desplegar]] — guía completa de deploy
