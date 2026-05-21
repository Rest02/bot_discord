import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, InteractionType, SlashCommandBuilder, REST, Routes, type ChatInputCommandInteraction } from 'discord.js';
import { DISCORD_CLIENT } from '../discord/constants.js';
import { ModerationService } from './moderation.service.js';

@Injectable()
export class ModerationCommand implements OnModuleInit {
  private readonly logger = new Logger(ModerationCommand.name);

  constructor(
    private readonly moderationService: ModerationService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerSlashCommands();
  }

  private async registerSlashCommands(): Promise<void> {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      this.logger.warn('DISCORD_GUILD_ID no configurado — no se registran comandos');
      return;
    }

    const command = new SlashCommandBuilder()
      .setName('modconfig')
      .setDescription('Configurar la moderación automática por inactividad')
      .addIntegerOption((opt) =>
        opt
          .setName('dias')
          .setDescription('Días de inactividad antes de moderar (1-30)')
          .setMinValue(1)
          .setMaxValue(30),
      )
      .addStringOption((opt) =>
        opt
          .setName('accion')
          .setDescription('Acción a ejecutar contra usuarios inactivos')
          .addChoices(
            { name: 'Expulsar (Kick)', value: 'kick' },
            { name: 'Banear', value: 'ban' },
          ),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('habilitar')
          .setDescription('Activar o desactivar la moderación automática'),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('excluir-admins')
          .setDescription('Excluir administradores de la moderación'),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('excluir-bots')
          .setDescription('Excluir otros bots de la moderación'),
      );

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    try {
      await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId), {
        body: [command.toJSON()],
      });
      this.logger.log(`Comando /modconfig registrado en el guild ${guildId}`);
    } catch (error) {
      this.logger.error(`Error registrando comando: ${error instanceof Error ? error.message : error}`);
    }

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== 'modconfig') return;

      if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', ephemeral: true });
        return;
      }

      await this.handleCommand(interaction);
    });
  }

  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildId = interaction.guildId!;
      const dias = interaction.options.getInteger('dias');
      const accion = interaction.options.getString('accion') as 'kick' | 'ban' | null;
      const habilitar = interaction.options.getBoolean('habilitar');
      const excluirAdmins = interaction.options.getBoolean('excluir-admins');
      const excluirBots = interaction.options.getBoolean('excluir-bots');

      const config = await this.moderationService.updateConfig(guildId, {
        ...(dias !== null && { inactivityDays: dias }),
        ...(accion !== null && { action: accion }),
        ...(habilitar !== null && { enabled: habilitar }),
        ...(excluirAdmins !== null && { excludeAdmins: excluirAdmins }),
        ...(excluirBots !== null && { excludeBots: excluirBots }),
      });

      const status = config.enabled ? '✅ Activada' : '❌ Desactivada';
      await interaction.editReply({
        content: [
          `**Configuración actualizada**`,
          `Estado: ${status}`,
          `Días de inactividad: ${config.inactivityDays}`,
          `Acción: ${config.action === 'kick' ? 'Expulsar' : 'Banear'}`,
          `Excluir admins: ${config.excludeAdmins ? 'Sí' : 'No'}`,
          `Excluir bots: ${config.excludeBots ? 'Sí' : 'No'}`,
        ].join('\n'),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error en comando modconfig: ${msg}`);
      await interaction.editReply({ content: `❌ Error: ${msg}` });
    }
  }
}
