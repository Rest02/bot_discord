---
title: Dockerizar y Desplegar
tags:
  - devops
  - deploy
  - docker
aliases:
  - Deployment Guide
cssclasses:
  - guide-doc
---

# Dockerizar y Desplegar

Guía para empaquetar el bot en Docker y desplegarlo en producción.

## Requisitos

- Docker Engine 24+
- Docker Compose v2+
- Acceso al servidor (VPS, Railway, Render, etc.)
- Token del bot y credenciales de DB

## Build de la Imagen

```bash
# Construir imagen (producción)
docker build -t discord-mod-bot:latest .

# Verificar que existe
docker images | grep discord-mod-bot
```

> [!note] Imagen base
> Se usa `node:20-slim` (Debian) en vez de `node:20-alpine`. Alpine usa musl libc que tiene problemas de resolución DNS con Docker Desktop. `slim` usa glibc, compatible y estable.

## Despliegue con Docker Compose

```bash
# Clonar en el servidor
git clone <repo-url> /opt/discord-bot
cd /opt/discord-bot

# Crear .env con datos reales
cp .env.example .env
nano .env

# Asegurar include en tsconfig (ver Docker.md)
# "include": ["src/**/*"] en tsconfig.json y tsconfig.build.json

# Levantar servicios (producción, sin override)
docker compose -f docker-compose.yml up -d --build

# Verificar estado
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs -f app

# Ver health check
curl http://localhost:3000/health
```

## Estructura final de archivos

| Archivo | Propósito |
|---------|-----------|
| `Dockerfile` | Multi-stage: build con tsc + runtime con node |
| `docker-compose.yml` | Servicios postgres + app (producción) |
| `docker-compose.override.yml` | Dev: hot-reload con `nest start --watch` |
| `.env` | Credenciales (DB_HOST apunta a localhost) |

## Actualización del Bot

```bash
# Pull latest code
git pull

# Rebuild y restart (producción)
docker compose -f docker-compose.yml up --build -d

# Revisar logs post-deploy
docker compose -f docker-compose.yml logs -f --tail=50 app
```

## Monitoreo en Producción

```bash
# Logs en tiempo real
docker compose -f docker-compose.yml logs -f app

# Estado de contenedores
docker compose -f docker-compose.yml ps

# Recursos
docker stats discord-bot-server

# Backup DB
docker compose -f docker-compose.yml exec postgres pg_dump -U ${DB_USER} discord_bot > backup_$(date +%Y%m%d).sql
```

## Referencias

- [[Docker]] — configuración detallada de contenedores
- [[Arquitectura Bot Discord#Infraestructura y Despliegue]]
- [[Registrar Bot en Discord Portal]]
