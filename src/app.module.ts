import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
