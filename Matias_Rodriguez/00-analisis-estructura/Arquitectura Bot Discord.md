---
title: Arquitectura del Bot de Discord
date: 2026-05-20
tags:
  - arquitectura
  - discord-bot
  - nestjs
  - postgresql
  - docker
aliases:
  - Bot Architecture
cssclasses:
  - arquitectura-doc
---

# Arquitectura del Bot de Discord

> [!info] Propósito
> Bot de moderación que monitorea actividad de usuarios y expulsa/banea automáticamente a aquellos sin actividad en los últimos 3 días.

## Stack Tecnológico y Patrones

### Tecnologías

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Runtime | Node.js (LTS) + TypeScript | Tipado estático, ecosistema maduro |
| Framework | [[NestJS]]  | Arquitectura modular decorators-first, DI nativa |
| ORM | [[Prisma]] | Type-safe queries, migraciones automáticas |
| Base de Datos | [[PostgreSQL]]  | Robusta, soporte JSONB, confiable |
| Contenedores | [[Docker]] + Docker Compose | Reproducibilidad, dev/prod parity |
| Cliente Discord | `discord.js` (v14+) | SDK oficial, soporte completo de Gateway Intents |

### Patrón Arquitectónico

**Monolito Modular** con enfoque hexagonal implícito:

```
┌─────────────────────────────────────────────────────┐
│                    API Layer                         │
│  (Slash Commands, Event Handlers, Middleware)        │
├─────────────────────────────────────────────────────┤
│                  Service Layer                       │
│  (ActivityService, ModerationService, MemberService) │
├─────────────────────────────────────────────────────┤
│                  Repository Layer                    │
│  (PrismaService, GatewayRepository)                  │
├─────────────────────────────────────────────────────┤
│                  Infrastructure                      │
│  (Discord Client, Cron Jobs, Logger, Rate Limiter)  │
└─────────────────────────────────────────────────────┘
```

Cada módulo de NestJS encapsula su dominio: `ActivityModule`, `ModerationModule`, `GuildModule`, `SchedulingModule`. La inyección de dependencias mantiene bajo acoplamiento.

> [!tip] NestJS soporta nativamente `@Cron` de `@nestjs/schedule` para la tarea periódica de revisión de actividad.

## Diagrama de Componentes

```mermaid
graph TB
    subgraph Discord
        API[Discord API]
        GW[Gateway WebSocket]
    end

    subgraph Bot[NestJS Application]
        Client[Discord Client<br/>discord.js]
        Handler[Event Handlers<br/>messageCreate, voiceStateUpdate]
        CMD[Command Bus<br/>Slash Commands]
        
        subgraph Services[Service Layer]
            AS[ActivityService]
            MS[ModerationService]
            GS[GuildService]
        end

        subgraph Jobs[Scheduled Tasks]
            CRON[Cron: CheckActivityJob<br/>cada 24h]
        end

        subgraph DB[Data Layer]
            PR[Prisma Service]
            Q[Queue Manager]
        end

        subgraph Infra[Infrastructure]
            LOG[Structured Logger]
            RL[Rate Limiter]
            HEALTH[Health Check]
        end
    end

    subgraph Storage
        PG[(PostgreSQL)]
    end

    API <-->|REST| Client
    GW <-->|WebSocket| Client
    Client --> Handler
    Client --> CMD
    Handler --> AS
    CMD --> AS
    AS --> MS
    MS --> GS
    AS --> PR
    CRON --> AS
    PR --> PG
    MS --> RL
    RL -->|Backoff| API

    classDef discord fill:#5865F2,color:#fff
    classDef bot fill:#1a1a2e,color:#fff
    classDef service fill:#16213e,color:#fff
    classDef storage fill:#0f3460,color:#fff
    class API,GW discord
    class Client,Handler,CMD bot
    class AS,MS,GS service
    class PG storage
```

### Flujo de Actividad

1. **Usuario envía mensaje** → Discord Gateway emite `messageCreate`
2. **Handler** recibe el evento, extrae `userId`, `guildId`, `timestamp`
3. **ActivityService** registra o actualiza `lastActivityAt` en PostgreSQL
4. **Cada 24h**, `CheckActivityJob` ejecuta query: miembros con `lastActivityAt < NOW() - INTERVAL '3 days'`
5. **ModerationService** ejecuta `kick()` o `ban()` contra Discord API
6. **Resultado** se persiste en tabla `ModerationLog`

## Modelo de Datos Principal

```mermaid
erDiagram
    Guild {
        string id PK
        string name
        jsonb settings
        datetime createdAt
        datetime updatedAt
    }

    Member {
        string id PK
        string guildId FK
        string userId
        string nickname
        boolean isBot
        datetime joinedAt
        datetime lastActivityAt
        datetime createdAt
    }

    ActivityEvent {
        string id PK
        string memberId FK
        string guildId FK
        string eventType
        jsonb metadata
        datetime timestamp
    }

    ModerationLog {
        string id PK
        string guildId FK
        string targetUserId
        string action
        string reason
        string moderatorId
        boolean success
        datetime executedAt
    }

    GuildConfig {
        string id PK
        string guildId FK
        int inactivityDays
        string action
        boolean excludeAdmins
        boolean excludeBots
        boolean enabled
    }

    Guild ||--o{ Member : contains
    Guild ||--o| GuildConfig : configures
    Member ||--o{ ActivityEvent : generates
    Member ||--o{ ModerationLog : targets
```

### Schema Prisma

```prisma
model Guild {
  id        String   @id
  name      String
  settings  Json?    @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   Member[]
  config    GuildConfig?
  logs      ModerationLog[]
}

model Member {
  id             String   @id @default(cuid())
  guildId        String
  userId         String
  nickname       String?
  isBot          Boolean  @default(false)
  joinedAt       DateTime
  lastActivityAt DateTime
  createdAt      DateTime @default(now())

  guild          Guild           @relation(fields: [guildId], references: [id])
  events         ActivityEvent[]
  moderationLogs ModerationLog[]

  @@unique([guildId, userId])
  @@index([guildId, lastActivityAt])
}

model ActivityEvent {
  id        String   @id @default(cuid())
  memberId  String
  guildId   String
  eventType String   // message, voice, reaction, presence
  metadata  Json?    @default("{}")
  timestamp DateTime @default(now())

  member Member @relation(fields: [memberId], references: [id])
  guild  Guild  @relation(fields: [guildId], references: [id])

  @@index([memberId, timestamp])
}

model GuildConfig {
  id             String  @id @default(cuid())
  guildId        String  @unique
  inactivityDays Int     @default(3)
  action         String  @default("kick") // kick | ban
  excludeAdmins  Boolean @default(true)
  excludeBots    Boolean @default(true)
  enabled        Boolean @default(false)

  guild Guild @relation(fields: [guildId], references: [id])
}

model ModerationLog {
  id           String   @id @default(cuid())
  guildId      String
  targetUserId String
  action       String   // kick | ban
  reason       String
  moderatorId  String   // "auto" for automated
  success      Boolean
  errorMessage String?
  executedAt   DateTime @default(now())

  guild  Guild  @relation(fields: [guildId], references: [id])
  member Member @relation(fields: [targetUserId], references: [id])
}
```

## Infraestructura y Despliegue

### Estructura Docker

```
bot-discord/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── activity/
│   ├── moderation/
│   ├── guild/
│   ├── scheduling/
│   └── common/
└── test/
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  bot:
    build: .
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

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

### Variables de Entorno

```env
# .env.example
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id

DB_HOST=postgres
DB_PORT=5432
DB_USER=discord_bot
DB_PASSWORD=secure_password
DB_NAME=discord_bot

NODE_ENV=production
LOG_LEVEL=info
```

> [!warning] Nunca commitees el `.env` real. Usa `.env.example` como template y agrega `.env` a `.gitignore`.

## Requisitos No Funcionales y Resiliencia

### Rate Limits de Discord API

| Estrategia | Implementación |
|-----------|---------------|
| **Global** | `@discordjs/rest` maneja headers `X-RateLimit-*` automáticamente |
| **Bucket** | Agrupar requests por bucket (guild + endpoint) |
| **Backoff** | Retry con backoff exponencial + jitter en 429s |
| **Cola** | Queue de moderation actions con prioridad |

```typescript
// Estrategia de backoff
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DiscordAPIError && error.status === 429) {
        const retryAfter = error.retryAfter * 1000 + Math.random() * 1000;
        await sleep(retryAfter);
        continue;
      }
      throw error;
    }
  }
}
```

### Reconexión WebSocket

El SDK `discord.js` maneja reconexión automática con backoff. Configuración recomendada:

```typescript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  failIfNotExists: false,
  // Reconexión nativa: activa por defecto
});
```

> [!tip] Escucha el evento `shardDisconnect` para loggear y triggerear alertas en producción.

### Logs Estructurados

Usar `pino` o `winston` con formato JSON para integración con sistemas de logging externos:

```typescript
// Ejemplo con pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
});

logger.info({ guildId, userId, action }, 'Moderation action executed');
```

### Tolerancia a Fallos

| Escenario | Estrategia |
|-----------|-----------|
| DB caída | Retry connection con backoff; el bot sigue operando pero sin persistencia |
| Discord API down | Queue de moderación en memoria; re-intentar en próxima ventana |
| Bot se cae | `restart: unless-stopped` en Docker; graceful shutdown con `SIGTERM` |
| Error en medio de batch | Procesar miembros uno por uno; loggear fallos individuales sin abortar batch |

### Health Check Endpoint

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    const dbOk = await prisma.$queryRaw`SELECT 1`;
    const wsOk = client.ws.status === WebSocketShardStatus.Ready;

    return {
      status: dbOk && wsOk ? 'ok' : 'degraded',
      discord: wsOk ? 'connected' : 'disconnected',
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

> [!abstract] Próximos Pasos
> 1. [[Registrar Bot en Discord Portal]]
> 2. [[Configurar NestJS + Prisma]]
> 3. [[Implementar ActivityModule]]
> 4. [[Implementar ModerationModule]]
> 5. [[Dockerizar y desplegar]]
