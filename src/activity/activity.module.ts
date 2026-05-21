import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { ActivityGateway } from './activity.gateway.js';

@Module({
  providers: [ActivityService, ActivityGateway],
  exports: [ActivityService],
})
export class ActivityModule {}
