import { Global, Module } from '@nestjs/common';
import { DiscordService } from './discord.service.js';
import { DISCORD_CLIENT } from './constants.js';

@Global()
@Module({
  providers: [
    DiscordService,
    {
      provide: DISCORD_CLIENT,
      useFactory: (service: DiscordService) => service.client,
      inject: [DiscordService],
    },
  ],
  exports: [DiscordService, DISCORD_CLIENT],
})
export class DiscordModule {}
