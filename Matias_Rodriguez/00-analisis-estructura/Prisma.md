---
title: Prisma
tags:
  - arquitectura
  - base-de-datos
  - orm
aliases:
  - Prisma ORM
cssclasses:
  - tech-doc
---

# Prisma

ORM moderno para Node.js y TypeScript. Genera un cliente type-safe a partir del schema declarativo.

## Ventajas

- **Type Safety** — el cliente generado conoce todos los modelos, tipos de campos y relaciones
- **Migraciones automáticas** — `prisma migrate dev` genera SQL a partir de cambios en schema
- **Studio** — `prisma studio` para inspeccionar datos en el navegador
- **Relaciones intuitivas** — sintaxis declarativa para `@relation`, `@@unique`, `@@index`

## Schema Principal

Ver modelo completo en [[Arquitectura Bot Discord#Modelo de Datos Principal]].

Modelos definidos:

- `Guild` — servidor de Discord
- `Member` — miembro con `lastActivityAt`
- `ActivityEvent` — registro de actividad individual
- `GuildConfig` — configuración por servidor
- `ModerationLog` — historial de acciones

## Comandos Útiles

```bash
# Inicializar Prisma en el proyecto
npx prisma init

# Crear migration después de cambiar schema
npx prisma migrate dev --name add_guild_config

# Aplicar migraciones en producción
npx prisma migrate deploy

# Abrir studio
npx prisma studio

# Regenerar cliente
npx prisma generate
```

## Conexión con NestJS

```typescript
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

## Referencias

- [Documentación Prisma](https://www.prisma.io/docs)
- [[NestJS]] — framework que consume PrismaService
- [[PostgreSQL]] — base de datos subyacente
