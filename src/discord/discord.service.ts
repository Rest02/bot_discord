import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';

@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
  public readonly client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });
  }

  async onModuleInit() {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      console.warn('DISCORD_TOKEN no configurado — el bot no se conectará a Discord');
      return;
    }
    await this.client.login(token);
    console.log(`Bot conectado como ${this.client.user?.tag}`);
  }

  async onModuleDestroy() {
    if (this.client.isReady()) {
      this.client.destroy();
    }
  }
}
