import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { ModerationService } from './moderation.service.js';
import { ModerationCommand } from './moderation.command.js';
import { CheckActivityJob } from './check-activity.job.js';

@Module({
  imports: [ActivityModule],
  providers: [ModerationService, ModerationCommand, CheckActivityJob],
  exports: [ModerationService],
})
export class ModerationModule {}
