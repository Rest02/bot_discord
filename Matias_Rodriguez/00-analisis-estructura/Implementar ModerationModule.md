---
title: Implementar ModerationModule
tags:
  - implementacion
  - modulo
  - moderacion
aliases:
  - Moderation Module
cssclasses:
  - code-doc
---

# Implementar ModerationModule

Módulo encargado de ejecutar acciones de moderación (kick/ban) contra miembros inactivos.

## Responsabilidades

- Consultar miembros inactivos via [[Implementar ActivityModule#ActivityService]]
- Ejecutar kick o ban contra Discord API
- Registrar resultados en `ModerationLog`
- Excluir admins, bots y roles protegidos según configuración

## Estructura

```
src/moderation/
├── moderation.module.ts
├── moderation.service.ts
├── moderation.command.ts
└── dto/
    └── moderation-action.dto.ts
```

## ModerationService

```typescript
@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {}

  async processInactiveMembers(guildId: string): Promise<ModerationLog[]> {
    const config = await this.prisma.guildConfig.findUnique({
      where: { guildId },
    });

    if (!config?.enabled) return [];

    const guild = await this.client.guilds.fetch(guildId);
    const members = await guild.members.fetch();
    const excludedRoles = config.excludeRoles ?? [];

    const inactiveMembers = await this.activityService.getInactiveMembers(
      guildId,
      config.inactivityDays,
    );

    const results: ModerationLog[] = [];

    for (const member of inactiveMembers) {
      const discordMember = members.get(member.userId);
      if (!discordMember) continue;

      // Exclusiones
      if (config.excludeAdmins && discordMember.permissions.has(PermissionFlagsBits.Administrator)) continue;
      if (config.excludeBots && discordMember.user.bot) continue;
      if (discordMember.roles.cache.some(r => excludedRoles.includes(r.id))) continue;

      try {
        if (config.action === 'ban') {
          await discordMember.ban({ reason: `Inactivo por ${config.inactivityDays}+ días` });
        } else {
          await discordMember.kick(`Inactivo por ${config.inactivityDays}+ días`);
        }

        const log = await this.prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: member.userId,
            action: config.action,
            reason: `Inactivo por ${config.inactivityDays}+ días`,
            moderatorId: 'auto',
            success: true,
          },
        });
        results.push(log);
      } catch (error) {
        await this.prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: member.userId,
            action: config.action,
            reason: `Inactivo por ${config.inactivityDays}+ días`,
            moderatorId: 'auto',
            success: false,
            errorMessage: error.message,
          },
        });
      }
    }

    return results;
  }
}
```

## Slash Command

```typescript
@Injectable()
export class ModerationCommand {
  @Inject(DISCORD_CLIENT) private readonly client: Client;

  register(): void {
    const command = new SlashCommandBuilder()
      .setName('modconfig')
      .setDescription('Configurar moderación automática')
      .addIntegerOption(opt =>
        opt.setName('dias')
          .setDescription('Días de inactividad antes de moderar')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(30))
      .addStringOption(opt =>
        opt.setName('accion')
          .setDescription('Acción a ejecutar')
          .addChoices(
            { name: 'Kick', value: 'kick' },
            { name: 'Ban', value: 'ban' },
          ))
      .addBooleanOption(opt =>
        opt.setName('habilitar')
          .setDescription('Activar o desactivar la moderación automática'));

    // registro del comando...
  }
}
```

## Configuración por Servidor

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `inactivityDays` | Int | 3 | Días sin actividad antes de actuar |
| `action` | String | `kick` | `kick` o `ban` |
| `excludeAdmins` | Bool | `true` | Excluir admins del barrido |
| `excludeBots` | Bool | `true` | Excluir otros bots |
| `enabled` | Bool | `false` | Activar/desactivar el sistema |

## Referencias

- [[Arquitectura Bot Discord#Diagrama de Componentes]]
- [[Implementar ActivityModule]] — fuente de datos de inactividad
- [[Configurar NestJS + Prisma]]
