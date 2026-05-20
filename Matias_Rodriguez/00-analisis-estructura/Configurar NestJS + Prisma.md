---
title: Configurar NestJS + Prisma
tags:
  - setup
  - backend
  - guia
aliases:
  - Setup del proyecto
  - Inicializar proyecto
cssclasses:
  - guide-doc
---

# Configurar NestJS + Prisma

Guía para inicializar el proyecto desde cero.

## 1. Crear Proyecto NestJS

```bash
npm i -g @nestjs/cli
nest new discord-bot
cd discord-bot
```

Seleccionar **npm** como package manager.

## 2. Instalar Dependencias

```bash
# Discord
npm install discord.js @discordjs/rest @discordjs/builders

# Prisma
npm install @prisma/client
npm install -D prisma

# Scheduling
npm install @nestjs/schedule

# Logger (opcional)
npm install pino pino-pretty

# Validation
npm install class-validator class-transformer
```

## 3. Inicializar Prisma

```bash
npx prisma init
```

Esto crea `prisma/schema.prisma` y configura `DATABASE_URL` en `.env`.

## 4. Crear PrismaService

```bash
nest generate module prisma
nest generate service prisma
```

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

```typescript
// prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## 5. Configurar Módulo Schedule

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ActivityModule,
    ModerationModule,
  ],
})
export class AppModule {}
```

## Referencias

- [[NestJS]] — estructura de módulos
- [[Prisma]] — schema y migraciones
- [[Registrar Bot en Discord Portal]]
