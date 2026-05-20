---
title: Implementar ActivityModule
tags:
  - implementacion
  - modulo
  - actividad
aliases:
  - Activity Module
cssclasses:
  - code-doc
---

# Implementar ActivityModule

Módulo encargado de rastrear la actividad de los miembros en el servidor.

## Responsabilidades

- Escuchar eventos de Discord (`messageCreate`, `voiceStateUpdate`, etc.)
- Registrar `lastActivityAt` en la base de datos por cada evento
- Proveer métodos para consultar actividad a otros módulos

## Estructura

```
src/activity/
├── activity.module.ts
├── activity.service.ts
├── activity.gateway.ts
└── dto/
    └── activity-event.dto.ts
```

## ActivityGateway

```typescript
@Injectable()
export class ActivityGateway {
  constructor(
    private readonly activityService: ActivityService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {}

  @OnEvent('messageCreate')
  async handleMessage(message: Message) {
    if (message.author.bot) return;
    await this.activityService.recordActivity({
      guildId: message.guild.id,
      userId: message.author.id,
      eventType: 'message',
      metadata: { channelId: message.channel.id },
      timestamp: new Date(),
    });
  }

  @OnEvent('voiceStateUpdate')
  async handleVoiceState(oldState: VoiceState, newState: VoiceState) {
    if (!newState.member || newState.member.user.bot) return;
    if (newState.channelId) {
      await this.activityService.recordActivity({
        guildId: newState.guild.id,
        userId: newState.member.id,
        eventType: 'voice',
        metadata: { channelId: newState.channelId },
        timestamp: new Date(),
      });
    }
  }
}
```

## ActivityService

```typescript
@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async recordActivity(dto: ActivityEventDto): Promise<void> {
    const { guildId, userId, eventType, metadata, timestamp } = dto;

    await this.prisma.$transaction([
      this.prisma.activityEvent.create({
        data: { guildId, memberId: userId, eventType, metadata, timestamp },
      }),
      this.prisma.member.upsert({
        where: { guildId_userId: { guildId, userId } },
        update: { lastActivityAt: timestamp },
        create: { guildId, userId, lastActivityAt: timestamp, joinedAt: timestamp },
      }),
    ]);
  }

  async getInactiveMembers(
    guildId: string,
    days: number,
  ): Promise<Member[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.member.findMany({
      where: {
        guildId,
        lastActivityAt: { lt: cutoff },
        isBot: false,
      },
    });
  }
}
```

## Eventos Monitorizados

| Evento | Descripción |
|--------|-------------|
| `messageCreate` | Mensajes en canales de texto |
| `voiceStateUpdate` | Conexión a canal de voz |
| `messageReactionAdd` | Reacción a mensaje |
| `presenceUpdate` | Cambio de estado (online/offline) — opcional |

## Referencias

- [[NestJS]] — framework base
- [[Prisma]] — persistencia de actividad
- [[Arquitectura Bot Discord#Modelo de Datos Principal]]
- [[Implementar ModerationModule]] — consume este módulo para decidir kicks
