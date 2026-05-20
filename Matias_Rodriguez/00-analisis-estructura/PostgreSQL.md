---
title: PostgreSQL
tags:
  - arquitectura
  - base-de-datos
  - infraestructura
aliases:
  - Postgres
  - PG
cssclasses:
  - tech-doc
---

# PostgreSQL

Base de datos relacional open-source elegida como almacenamiento principal del bot.

## ¿Por qué PostgreSQL?

- **Confiabilidad** — ACID compliance, madurez del proyecto (30+ años)
- **JSONB** — almacenar metadata flexible sin perder capacidad de consulta
- **Índices parciales** — índices eficientes para consultas frecuentes (`WHERE lastActivityAt < ...`)
- **Docker friendly** — imagen oficial `postgres:16-alpine` lista para producción
- **Ecosistema** — Prisma, pgAdmin, herramientas de backup maduras

## Configuración en Desarrollo

```yaml
# docker-compose.yml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: discord_bot
    POSTGRES_USER: ${DB_USER}
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  ports:
    - "5432:5432"
  volumes:
    - pgdata:/var/lib/postgresql/data
```

## Conexión desde Prisma

```env
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
```

## Buenas Prácticas

- **Health check** con `pg_isready` antes de que el bot intente conectarse
- **Volumen persistente** en Docker para no perder datos al reiniciar
- **Backups periódicos** con `pg_dump` para producción

## Referencias

- [[Prisma]] — ORM que conecta NestJS con PostgreSQL
- [[Docker]] — contenedor donde corre PostgreSQL
