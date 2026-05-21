---
title: Setup Inicial del Proyecto
date: 2026-05-20
tags:
  - setup
  - instalacion
  - nestjs
  - prisma
  - docker
  - discord-bot
aliases:
  - Fase 1 Setup
  - Configuracion Inicial
cssclasses:
  - setup-doc
---

# Setup Inicial del Proyecto

> [!abstract] Objetivo
> Inicializar el proyecto NestJS, configurar Docker con PostgreSQL, integrar Prisma ORM, y dejar la base lista para empezar a implementar los módulos del bot.

## Herramientas Verificadas

Antes de empezar se verificó el entorno:

| Herramienta | Versión | Estado |
|-------------|---------|--------|
| Node.js | v22.20.0 | ✅ |
| npm | 11.6.2 | ✅ |
| Docker | 29.4.0 | ✅ |
| Docker Compose | v5.1.1 | ✅ |
| Git | 2.51.0 | ✅ |

## Desarrollo Agentic

El setup se dividió en **dos fases ejecutadas con agentes en paralelo**:

### Fase 1 — Agentes en Paralelo

```mermaid
gantt
    title Fase 1 - Paralelo
    dateFormat  HH:mm
    axisFormat %H:%M
    
    section Agente A
    NestJS Init + npm install     :a1, 09:00, 4m
    
    section Agente B
    Docker infra + .gitignore     :b1, 09:00, 2m
```

#### Agente A: NestJS + dependencias

- Inicializó el proyecto con `@nestjs/cli`
- Instaló todas las dependencias del stack:
  - `discord.js`, `@discordjs/rest`, `@discordjs/builders`
  - `@nestjs/schedule`
  - `@prisma/client`, `prisma`
  - `class-validator`, `class-transformer`
  - `pino`

#### Agente B: Infraestructura base

Creó los archivos base del proyecto:

- [[Docker#Docker Compose|docker-compose.yml]] — PostgreSQL 16 Alpine con health check
- `.env.example` — Template de variables de entorno
- [[Docker#Dockerfile|Dockerfile]] — Multi-stage build
- `.gitignore` — Exclusiones para GitHub

### Fase 2 — Secuencia

```mermaid
gantt
    title Fase 2 - Secuencial
    dateFormat  HH:mm
    axisFormat %H:%M
    
    section Agente C
    Schema Prisma + Module + Migration  :c1, 09:05, 5m
    
    section Post-Fix
    Puerto PostgreSQL                   :d1, after c1, 2m
    
    section Setup Final
    PrismaService v7 + Health + Build   :e1, after d1, 2m
```

#### Agente C: Prisma schema + módulo

- Definió el [[Arquitectura Bot Discord#Modelo de Datos Principal|schema con 5 modelos]]
- Creó [[Prisma#Conexión con NestJS|PrismaService]] y PrismaModule

## Incidentes y Soluciones

### ⚠️ Issue #1: npm bloqueado por PowerShell

**Problema:** La ejecución de scripts de PowerShell estaba deshabilitada, bloqueando npm.

**Solución:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### ⚠️ Issue #2: Prisma v7 cambió la API

**Problema:** Prisma 7.8.0 eliminó el campo `url` del datasource en schema.prisma y el `PrismaClient` ahora requiere un adapter.

**Solución:**
1. Se movió la URL a `prisma.config.ts`
2. Se instaló `@prisma/adapter-pg`
3. Se configuró `PrismaService` con `new PrismaPg(...)`:
   ```typescript
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
   super({ adapter });
   ```
4. Se definió `output` del generador en `src/generated/prisma`

### ⚠️ Issue #3: ESM + tsconfig — error de resolución de módulos

**Problema:** Prisma v7 genera cliente ESM con `import.meta.url`, incompatible con `moduleResolution: "bundler"`. El build inicial fallaba con errores de módulo no encontrado al ejecutar desde `dist/`.

**Solución:**
1. Se cambió `tsconfig.json`:
   ```json
   {
     "module": "nodenext",
     "moduleResolution": "nodenext"
   }
   ```
2. Se agregaron extensiones `.js` a **todos** los imports relativos del `src/`:
   ```typescript
   // Antes
   import { ActivityService } from './activity.service';
   // Después
   import { ActivityService } from './activity.service.js';
   ```
3. Se ejecuta el bot compilado con `node dist/src/main.js` (ESM nativo)

### ⚠️ Issue #4: Puerto PostgreSQL conflictivo

**Problema:** Había un **PostgreSQL nativo de Windows** (PostgreSQL 18) ocupando el puerto `5432`, impidiendo la conexión al contenedor Docker.

**Solución:** Se cambió el puerto mapeado de Docker a `5433:5432` y se actualizaron las URLs en `.env`, `.env.example` y `prisma.config.ts`.

```yaml
# docker-compose.yml
ports:
  - "5433:5432"   # Host:Container
```

## Estructura Final del Proyecto

```
bot_discord/
│
├── src/                          ← Código fuente
│   ├── main.ts                   ← Entry point
│   ├── app.module.ts             ← Módulo raíz (Schedule + Prisma)
│   ├── health.controller.ts      ← GET /health
│   ├── generated/prisma/         ← Cliente Prisma (auto-generado)
│   └── prisma/
│       ├── prisma.module.ts      ← Módulo global de Prisma
│       └── prisma.service.ts     ← Conexión con adapter Prisma v7
│
├── prisma/
│   ├── schema.prisma             ← Modelos de datos
│   └── migrations/               ← Historial de migraciones
│
├── Matias_Rodriguez/             ← Documentación (vault Obsidian)
│   └── 00-analisis-estructura/   ← Fase de análisis
│
├── docker-compose.yml            ← PostgreSQL container
├── Dockerfile                    ← Multi-stage build
├── prisma.config.ts              ← Configuración Prisma v7
├── .env                          ← Variables locales (ignorado)
├── .env.example                  ← Template de variables
└── .gitignore                    ← Exclusiones GitHub
```

## Comandos Útiles

```bash
# Iniciar PostgreSQL
docker compose up -d postgres

# Ver logs de PostgreSQL
docker compose logs -f postgres

# Aplicar migraciones
npx prisma migrate deploy

# Abrir Prisma Studio
npx prisma studio --config prisma.config.ts

# Build + run (ESM compilado)
npm run build
node dist/src/main.js

# Iniciar en desarrollo (tsx hot-reload)
npm run start:dev

# O directamente con tsx
npx tsx src/main.ts
```

## Estado Actual de la DB

Las migraciones fueron aplicadas exitosamente:

| Migración | Descripción |
|-----------|-------------|
| `20260520231023_init` | Schema inicial con 5 modelos |
| `20260521000423_fix_relations` | Fix FK relaciones + `excludeRoles` |
| `20260521004259_add_username` | Campo `username` en `ActivityEvent` |

La base de datos tiene las 5 tablas listas:

- `Guild` — servidores de Discord
- `Member` — miembros con tracking de actividad
- `ActivityEvent` — eventos individuales de actividad (solo voz)
- `GuildConfig` — configuración por servidor
- `ModerationLog` — historial de acciones de moderación

## Próximos Pasos

1. [[Implementar ActivityModule]] — rastrear actividad de voz
2. [[Implementar ModerationModule]] — ejecutar kicks/bans automáticos
3. Registrar el bot en [[Registrar Bot en Discord Portal|Discord Portal]]
4. Configurar [[Configurar NestJS + Prisma#5. Configurar Módulo Schedule|Slash Commands]]
5. [[Dockerizar y desplegar]] — build multi-stage + deploy

---

> [!tip] Referencia
> Todo el detalle arquitectónico está en [[Arquitectura Bot Discord]] y los documentos asociados en `00-analisis-estructura/`.
