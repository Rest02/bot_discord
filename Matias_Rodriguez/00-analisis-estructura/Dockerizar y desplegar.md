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
# Construir imagen
docker build -t discord-mod-bot:latest .

# Verificar que existe
docker images | grep discord-mod-bot
```

## Despliegue con Docker Compose

```bash
# Clonar en el servidor
git clone <repo-url> /opt/discord-bot
cd /opt/discord-bot

# Crear .env con datos reales
cp .env.example .env
nano .env

# Levantar servicios
docker compose up -d

# Verificar estado
docker compose ps
docker compose logs -f bot

# Ver health check
curl http://localhost:3000/health
```

## Opciones de Hosting

### VPS (DigitalOcean, Linode, AWS EC2)

- **Pros**: control total, precio fijo (~$6/mes)
- **Contras**: requiere mantenimiento del SO
- **Recomendación**: instancia 1GB RAM, 1 vCPU

### Railway / Render

- **Pros**: zero-ops, despliegue desde GitHub, HTTPS incluido
- **Contras**: cold starts, límites de uso gratis
- **URL de health check pública** para monitorización externa

### Servidor doméstico

- **Pros**: gratuito si ya tienes el hardware
- **Contras**: depende de tu conexión, no 24/7 garantizado

## Actualización del Bot

```bash
# Pull latest code
git pull

# Rebuild y restart
docker compose up --build -d

# Revisar logs post-deploy
docker compose logs -f --tail=50 bot
```

## Monitoreo en Producción

```bash
# Logs en tiempo real
docker compose logs -f bot

# Estado de contenedores
docker compose ps

# Recursos
docker stats discord-bot-bot-1

# Backup DB
docker compose exec postgres pg_dump -U ${DB_USER} discord_bot > backup_$(date +%Y%m%d).sql
```

## Referencias

- [[Docker]] — configuración de contenedores
- [[Arquitectura Bot Discord#Infraestructura y Despliegue]]
- [[Registrar Bot en Discord Portal]]
