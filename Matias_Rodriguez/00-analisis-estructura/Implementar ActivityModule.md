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

- Escuchar eventos de Discord (`voiceStateUpdate`)
- Rastrear sesiones de voz en memoria (Map con `joinTime`)
- Registrar `lastActivityAt` solo si el usuario estuvo ≥ 30 min en un canal de voz
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
const MIN_VOICE_MINUTES = 30;

@Injectable()
export class ActivityGateway {
  private readonly voiceSessions = new Map<string, { joinTime: Date }>();

  constructor(
    private readonly activityService: ActivityService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {
    this.registerListeners();
  }

  private registerListeners(): void {
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState).catch((err) =>
        this.logger.error(`Error en voiceStateUpdate: ${err.message}`),
      );
    });
  }

  private async handleVoiceStateUpdate(oldState, newState): Promise<void> {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const key = `${newState.guild.id}-${member.id}`;

    // Se unió a un canal de voz
    if (!oldState.channelId && newState.channelId) {
      this.voiceSessions.set(key, { joinTime: new Date() });
      return;
    }

    // Salió del canal de voz
    if (oldState.channelId && !newState.channelId) {
      const session = this.voiceSessions.get(key);
      if (!session) return;
      this.voiceSessions.delete(key);

      const durationMin = Math.floor((Date.now() - session.joinTime.getTime()) / 60000);

      if (durationMin >= MIN_VOICE_MINUTES) {
        await this.activityService.recordActivity({
          guildId: newState.guild.id,
          userId: member.id,
          username: member.user.username,
          eventType: 'voice',
          metadata: { durationMinutes: durationMin },
        });
      }
      // Si < 30 min, se ignora (no reinicia contador)
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

    await this.prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId, name: `Guild-${guildId}` },
    });

    await this.prisma.$transaction([
      this.prisma.activityEvent.create({
        data: { guildId, userId, username: dto.username, eventType, metadata, timestamp },
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
| `voiceStateUpdate` | Conexión/desconexión a canal de voz |

> [!warning] Solo se registra actividad si el usuario estuvo **≥ 30 minutos** en el canal de voz. Conexiones breves no reinician el contador de inactividad.

## Referencias

- [[NestJS]] — framework base
- [[Prisma]] — persistencia de actividad
- [[Arquitectura Bot Discord#Modelo de Datos Principal]]
- [[Implementar ModerationModule]] — consume este módulo para decidir kicks
