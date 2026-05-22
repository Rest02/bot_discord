---
title: Docker
tags:
  - arquitectura
  - infraestructura
  - devops
  - docker
aliases:
  - Contenedores
  - Docker Compose
  - dockerizacion
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
├── docker-compose.override.yml    ← desarrollo (hot-reload)
├── .env
├── src/generated/prisma/          ← generado por prisma generate
└── src/
```

## Dockerfile

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

> [!warning] `include` en tsconfig
> Es obligatorio agregar `"include": ["src/**/*"]` en `tsconfig.json` y `tsconfig.build.json`. Sin esto, TypeScript compila desde la raíz del proyecto (tomando `prisma.config.ts` y otros archivos), generando el build en `dist/src/main.js` en vez de `dist/main.js`, lo que rompe el `CMD` del Dockerfile.

### Detalles del multi-stage

- **Builder**: instala dependencias, genera el cliente de Prisma, compila TypeScript con `nest build` (usa `tsc`, que soporta `emitDecoratorMetadata`)
- **Runner**: copia solo lo necesario (`dist/`, `node_modules/`, `prisma/`, `src/generated/`) y ejecuta con `node` directamente

> [!tip] ¿Por qué no usar `tsx`?
> `tsx` usa esbuild internamente, que **no soporta `emitDecoratorMetadata`**. NestJS necesita esta información para resolver dependencias por tipo. Si se usa `tsx`, falla con `Nest can't resolve dependencies` y muestra `?` como tipo desconocido.

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: discord-bot-db
    environment:
      POSTGRES_DB: discord_bot
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d discord_bot"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    container_name: discord-bot-server
    dns:
      - 8.8.8.8
      - 1.1.1.1
    env_file: .env
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DATABASE_URL=postgresql://discord_bot:changeme@postgres:5432/discord_bot?schema=public
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

> [!info] Variables de entorno en Docker
> Dentro de Docker, `DB_HOST` debe apuntar al nombre del servicio (`postgres`) y `DB_PORT` al puerto **interno** del contenedor (`5432`). El `.env` local usa `localhost:5433` (puerto externo mapeado), por eso se sobrescriben en `environment`.

### DNS explícito
Se agregaron `dns: [8.8.8.8, 1.1.1.1]` al servicio `app` para evitar errores `EAI_AGAIN` al resolver `discord.com`. Esto previene fallos del proxy DNS de Docker Desktop en macOS.

## Desarrollo (override)

`docker-compose.override.yml` se activa automáticamente al ejecutar `docker compose up`:

```yaml
services:
  app:
    command: sh -c "npx prisma generate && npx nest start --watch"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
```

- Usa `nest start --watch` para hot-reload con soporte completo de decorators
- Monta el código fuente como bind mount para reflejar cambios al instante
- `node_modules` se monta como volumen anónimo para preservar las dependencias nativas de Linux

## Comandos Útiles

```bash
# Desarrollo (con override + hot-reload)
docker compose up --build

# Producción (sin override)
docker compose -f docker-compose.yml up --build -d

# Ver logs del bot
docker compose logs -f app

# Detener
docker compose down

# Reset total (incluye volúmenes de DB)
docker compose down -v
```

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `EAI_AGAIN discord.com` | DNS no disponible en contenedor | Agregar `dns: [8.8.8.8]` al servicio |
| `dist/main.js not found` | TypeScript compila desde raíz | Agregar `"include": ["src/**/*"]` en tsconfig |
| `Nest can't resolve dependencies` | Usar `tsx` en vez de `tsc`/`node` | Usar `nest build` + `node` o `nest start --watch` |
| `npm ci` out of sync | Lock desactualizado | Ejecutar `npm install` localmente |

## Referencias

- [[Arquitectura Bot Discord#Infraestructura y Despliegue]]
- [[PostgreSQL]] — base de datos que corre en contenedor
- [[Dockerizar y desplegar]] — guía completa de deploy
