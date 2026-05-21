import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client, VoiceState } from 'discord.js';
import { DISCORD_CLIENT } from '../discord/constants.js';
import { ActivityService } from './activity.service.js';

const MIN_VOICE_MINUTES = 30;

@Injectable()
export class ActivityGateway {
  private readonly logger = new Logger(ActivityGateway.name);
  private readonly voiceSessions = new Map<string, { joinTime: Date }>();

  constructor(
    private readonly activityService: ActivityService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {
    this.registerListeners();
  }

  private registerListeners(): void {
    this.client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
      this.handleVoiceStateUpdate(oldState, newState).catch((err) =>
        this.logger.error(`Error en voiceStateUpdate: ${err.message}`),
      );
    });
  }

  private async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const key = `${newState.guild.id}-${member.id}`;
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // Se unió a un canal (old sin canal, new con canal)
    if (!oldChannelId && newChannelId) {
      this.voiceSessions.set(key, { joinTime: new Date() });
      this.logger.log(`${member.user.username} se unió a voz — sesión iniciada`);
      return;
    }

    // Salió del canal (old con canal, new sin canal)
    if (oldChannelId && !newChannelId) {
      const session = this.voiceSessions.get(key);
      if (!session) return;

      this.voiceSessions.delete(key);
      const durationMs = Date.now() - session.joinTime.getTime();
      const durationMin = Math.floor(durationMs / 60000);

      if (durationMin >= MIN_VOICE_MINUTES) {
        this.logger.log(`${member.user.username} estuvo ${durationMin} min — registrando actividad`);
        await this.activityService.recordActivity({
          guildId: newState.guild.id,
          userId: member.id,
          username: member.user.username,
          eventType: 'voice',
          metadata: { durationMinutes: durationMin },
        });
      } else {
        this.logger.log(`${member.user.username} estuvo solo ${durationMin} min — ignorado`);
      }
      return;
    }

    // Se cambió de canal — reiniciar sesión
    if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
      this.voiceSessions.set(key, { joinTime: new Date() });
      this.logger.log(`${member.user.username} cambió de canal — sesión reiniciada`);
    }
  }
}
