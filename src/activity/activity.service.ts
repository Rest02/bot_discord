import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RecordActivityDto } from './dto/activity-event.dto.js';
import type { Member, Prisma } from '../generated/prisma/client.js';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async recordActivity(dto: RecordActivityDto): Promise<void> {
    const { guildId, userId, eventType, metadata, timestamp } = dto;
    const now = timestamp ?? new Date();

    await this.prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId, name: `Guild-${guildId}` },
    });

    await this.prisma.$transaction([
      this.prisma.activityEvent.create({
        data: {
          guildId,
          userId,
          username: dto.username,
          eventType,
          metadata: (metadata ?? {}) as Prisma.InputJsonValue,
          timestamp: now,
        },
      }),
      this.prisma.member.upsert({
        where: { guildId_userId: { guildId, userId } },
        update: { lastActivityAt: now },
        create: {
          guildId,
          userId,
          lastActivityAt: now,
          joinedAt: now,
        },
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
    }) as Promise<Member[]>;
  }
}
