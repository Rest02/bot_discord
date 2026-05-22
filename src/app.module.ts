import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module.js';
import { DiscordModule } from './discord/discord.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { ModerationModule } from './moderation/moderation.module.js';
import { SuscripcionModule } from './suscripcion/suscripcion.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    DiscordModule,
    ActivityModule,
    ModerationModule,
    SuscripcionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
