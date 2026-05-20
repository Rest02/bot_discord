---
title: NestJS
tags:
  - arquitectura
  - backend
  - framework
aliases:
  - Nest
cssclasses:
  - tech-doc
---

# NestJS

Framework progresivo de Node.js para construir aplicaciones del lado del servidor eficientes y escalables.

## ¿Por qué NestJS?

- **TypeScript nativo** — tipado fuerte desde el inicio
- **Inyección de dependencias** — desacoplamiento natural entre capas
- **Decorators** — sintaxis declarativa para controladores, servicios, módulos
- **Modular** — cada dominio encapsulado en su propio módulo
- **Scheduling integrado** — `@nestjs/schedule` para tareas cron sin dependencias externas

## Estructura de Módulos en este Proyecto

```
src/
├── app.module.ts              # Módulo raíz
├── main.ts                    # Entry point (crea NestFactory + Discord Client)
├── activity/
│   ├── activity.module.ts
│   ├── activity.service.ts
│   ├── activity.gateway.ts    # Event handlers de Discord
│   └── dto/
├── moderation/
│   ├── moderation.module.ts
│   ├── moderation.service.ts
│   └── moderation.command.ts  # Slash commands
├── guild/
│   ├── guild.module.ts
│   ├── guild.service.ts
│   └── guild.config.ts
├── scheduling/
│   ├── scheduling.module.ts
│   └── check-activity.job.ts  # Cron job diario
└── common/
    ├── logger/
    ├── prisma/
    └── discord/
```

## Decorators Clave

```typescript
@Module({ imports: [PrismaModule], providers: [ActivityService], exports: [ActivityService] })
export class ActivityModule {}

@Injectable()
export class ActivityService {}

@Controller('health')
export class HealthController {
  @Get()
  check() { return { status: 'ok' }; }
}

@Cron('0 6 * * *') // 6:00 AM cada día
@Timeout(5000)
```

## Referencias

- [Documentación oficial NestJS](https://docs.nestjs.com)
- [[Prisma]] — ORM que usamos con NestJS
