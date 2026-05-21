import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { ModerationService } from './moderation.service.js';

@Injectable()
export class CheckActivityJob {
  private readonly logger = new Logger(CheckActivityJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moderationService: ModerationService,
  ) {}

  @Cron('0 6 * * *')
  async checkAllGuilds(): Promise<void> {
    this.logger.log('Iniciando revisión programada de actividad...');

    const configs = await this.prisma.guildConfig.findMany({
      where: { enabled: true },
    });

    if (configs.length === 0) {
      this.logger.log('No hay guilds con moderación habilitada');
      return;
    }

    for (const config of configs) {
      try {
        const results = await this.moderationService.processInactiveMembers(config.guildId);
        this.logger.log(`Guild ${config.guildId}: ${results.length} acciones ejecutadas`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error en guild ${config.guildId}: ${msg}`);
      }
    }

    this.logger.log('Revisión programada completada');
  }
}
