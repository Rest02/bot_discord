import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client, PermissionFlagsBits } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { DISCORD_CLIENT } from '../discord/constants.js';
import type { UpdateConfigDto } from './dto/update-config.dto.js';
import type { ModerationLog, GuildConfig } from '../generated/prisma/client.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {}

  async getConfig(guildId: string): Promise<GuildConfig | null> {
    return this.prisma.guildConfig.findUnique({ where: { guildId } });
  }

  async updateConfig(guildId: string, dto: UpdateConfigDto): Promise<GuildConfig> {
    await this.prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: {
        id: guildId,
        name: `Guild-${guildId}`,
      },
    });

    return this.prisma.guildConfig.upsert({
      where: { guildId },
      update: dto,
      create: {
        guildId,
        inactivityDays: dto.inactivityDays ?? 3,
        action: dto.action ?? 'kick',
        excludeAdmins: dto.excludeAdmins ?? true,
        excludeBots: dto.excludeBots ?? true,
        excludeRoles: dto.excludeRoles ?? [],
        enabled: dto.enabled ?? false,
      },
    });
  }

  async processInactiveMembers(guildId: string): Promise<ModerationLog[]> {
    const config = await this.prisma.guildConfig.findUnique({
      where: { guildId },
    });

    if (!config?.enabled) {
      this.logger.log(`Moderaci\u00f3n no habilitada para guild ${guildId}`);
      return [];
    }

    const guild = await this.client.guilds.fetch(guildId);
    const discordMembers = await guild.members.fetch();
    const excludedRoles = config.excludeRoles ?? [];

    const inactiveMembers = await this.activityService.getInactiveMembers(
      guildId,
      config.inactivityDays,
    );

    const results: ModerationLog[] = [];

    for (const member of inactiveMembers) {
      const discordMember = discordMembers.get(member.userId);
      if (!discordMember) continue;

      if (config.excludeAdmins && discordMember.permissions.has(PermissionFlagsBits.Administrator)) {
        this.logger.log(`Omitido admin ${member.userId}`);
        continue;
      }

      if (config.excludeBots && discordMember.user.bot) {
        continue;
      }

      if (discordMember.roles.cache.some((r) => excludedRoles.includes(r.id))) {
        this.logger.log(`Omitido rol protegido ${member.userId}`);
        continue;
      }

      const reason = `Inactivo por ${config.inactivityDays}+ d\u00edas`;

      try {
        if (config.action === 'ban') {
          await discordMember.ban({ reason });
        } else {
          await discordMember.kick(reason);
        }

        const log = await this.prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: member.userId,
            action: config.action,
            reason,
            moderatorId: 'auto',
            success: true,
          },
        });
        results.push(log as unknown as ModerationLog);
        this.logger.log(`${config.action} exitoso a ${member.userId}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error al moderar ${member.userId}: ${errMsg}`);

        await this.prisma.moderationLog.create({
          data: {
            guildId,
            targetUserId: member.userId,
            action: config.action,
            reason,
            moderatorId: 'auto',
            success: false,
            errorMessage: errMsg,
          },
        });
      }

      await sleep(1000);
    }

    this.logger.log(`Procesados ${results.length} miembros inactivos en guild ${guildId}`);
    return results;
  }
}
