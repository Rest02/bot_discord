import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Client,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { DISCORD_CLIENT } from '../discord/constants.js';
import { SuscripcionService } from './suscripcion.service.js';
import type { Suscripcion } from '../generated/prisma/client.js';

@Injectable()
export class SuscripcionCommand implements OnModuleInit {
  private readonly logger = new Logger(SuscripcionCommand.name);

  constructor(
    private readonly suscripcionService: SuscripcionService,
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

    const suscripcionCommand = new SlashCommandBuilder()
      .setName('suscripcion')
      .setDescription('Gestionar suscripciones compartidas')
      .addSubcommand((sub) =>
        sub
          .setName('crear')
          .setDescription('Registrar una nueva suscripción')
          .addStringOption((o) => o.setName('nombre').setDescription('Nombre de la suscripción (ej: spotify)').setRequired(true))
          .addNumberOption((o) => o.setName('monto_total').setDescription('Costo total mensual').setRequired(true))
          .addIntegerOption((o) =>
            o.setName('dia_cobro').setDescription('Día del mes del cobro (1-28)').setMinValue(1).setMaxValue(28).setRequired(true),
          )
          .addIntegerOption((o) =>
            o.setName('limite_usuarios').setDescription('Cupo máximo de miembros').setMinValue(1).setMaxValue(25).setRequired(true),
          )
          .addChannelOption((o) => o.setName('canal_recordatorio').setDescription('Canal para recordatorios de pago')),
      )
      .addSubcommand((sub) =>
        sub
          .setName('modificar')
          .setDescription('Actualizar el monto total de una suscripción')
          .addStringOption((o) => o.setName('nombre').setDescription('Nombre de la suscripción').setRequired(true))
          .addNumberOption((o) => o.setName('nuevo_monto_total').setDescription('Nuevo costo total mensual').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('unirse')
          .setDescription('Unirse a una suscripción')
          .addStringOption((o) => o.setName('nombre').setDescription('Nombre de la suscripción').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('agregar')
          .setDescription('Agregar un usuario a la suscripción (admin)')
          .addStringOption((o) => o.setName('nombre').setDescription('Nombre de la suscripción').setRequired(true))
          .addUserOption((o) => o.setName('usuario').setDescription('Usuario a agregar').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remover')
          .setDescription('Remover un usuario de la suscripción (admin)')
          .addStringOption((o) => o.setName('nombre').setDescription('Nombre de la suscripción').setRequired(true))
          .addUserOption((o) => o.setName('usuario').setDescription('Usuario a remover').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('estado')
          .setDescription('Ver el estado general de una suscripción')
          .addStringOption((o) => o.setName('nombre').setDescription('Nombre de la suscripción').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('historial')
          .setDescription('Ver tu historial de pagos en una suscripción')
          .addStringOption((o) => o.setName('nombre').setDescription('Nombre de la suscripción').setRequired(true)),
      );

    const pagarCommand = new SlashCommandBuilder()
      .setName('pagar')
      .setDescription('Registrar pago de un miembro (admin)')
      .addStringOption((o) => o.setName('suscripcion').setDescription('Nombre de la suscripción').setRequired(true))
      .addUserOption((o) => o.setName('usuario').setDescription('Usuario que pagó').setRequired(true))
      .addIntegerOption((o) =>
        o.setName('meses').setDescription('Meses que cubre el pago').setMinValue(1).setMaxValue(12).setRequired(true),
      );

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    try {
      await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId), {
        body: [suscripcionCommand.toJSON(), pagarCommand.toJSON()],
      });
      this.logger.log(`Comandos /suscripcion y /pagar registrados en el guild ${guildId}`);
    } catch (error) {
      this.logger.error(`Error registrando comandos: ${error instanceof Error ? error.message : error}`);
    }

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        if (interaction.commandName === 'suscripcion') {
          await this.handleSuscripcion(interaction);
        } else if (interaction.commandName === 'pagar') {
          await this.handlePagar(interaction);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`Error en comando ${interaction.commandName}: ${msg}`);
        if (interaction.deferred) {
          await interaction.editReply({ content: `❌ Error: ${msg}` }).catch(() => {});
        } else {
          await interaction.reply({ content: `❌ Error: ${msg}`, ephemeral: true }).catch(() => {});
        }
      }
    });
  }

  private async handleSuscripcion(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    const adminCommands = ['crear', 'modificar'];
    const adminOrOwnerCommands = ['agregar', 'remover'];

    if (adminCommands.includes(subcommand)) {
      if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.reply({ content: '❌ Solo los administradores del servidor pueden usar este comando.', ephemeral: true });
        return;
      }
    }

    switch (subcommand) {
      case 'crear':
        return this.handleCrear(interaction);
      case 'modificar':
        return this.handleModificar(interaction);
      case 'unirse':
        return this.handleUnirse(interaction);
      case 'agregar':
        return this.handleAgregar(interaction);
      case 'remover':
        return this.handleRemover(interaction);
      case 'estado':
        return this.handleEstado(interaction);
      case 'historial':
        return this.handleHistorial(interaction);
      default:
        await interaction.reply({ content: '❌ Subcomando desconocido.', ephemeral: true });
    }
  }

  private async handleCrear(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const nombre = interaction.options.getString('nombre', true);
    const montoTotal = interaction.options.getNumber('monto_total', true);
    const diaCobro = interaction.options.getInteger('dia_cobro', true);
    const limiteUsuarios = interaction.options.getInteger('limite_usuarios', true);
    const canal = interaction.options.getChannel('canal_recordatorio');

    const suscripcion = await this.suscripcionService.crear(
      { nombre, montoTotal, diaCobro, limiteUsuarios, canalRecordatorio: canal?.id },
      interaction.user.id,
    );

    await interaction.editReply({
      content: [
        `✅ Suscripción **${suscripcion.nombre}** creada exitosamente.`,
        `**Monto total:** $${Number(suscripcion.montoTotal).toFixed(2)}`,
        `**Día de cobro:** ${suscripcion.diaCobro}`,
        `**Límite de usuarios:** ${suscripcion.limiteUsuarios}`,
      ].join('\n'),
    });
  }

  private async handleModificar(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const nombre = interaction.options.getString('nombre', true);
    const nuevoMonto = interaction.options.getNumber('nuevo_monto_total', true);

    const suscripcion = await this.suscripcionService.modificar(nombre, nuevoMonto);

    await interaction.editReply({
      content: `✅ El monto total de **${suscripcion.nombre}** se actualizó a **$${Number(suscripcion.montoTotal).toFixed(2)}**.`,
    });
  }

  private async handleUnirse(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const nombre = interaction.options.getString('nombre', true);

    await this.suscripcionService.unirse(nombre, interaction.user.id);

    await interaction.editReply({
      content: `✅ Te has unido a **${nombre}** exitosamente.`,
    });
  }

  private async handleAgregar(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const nombre = interaction.options.getString('nombre', true);
    const usuario = interaction.options.getUser('usuario', true);

    if (interaction.user.id === usuario.id) {
      const suscripcion = await this.suscripcionService.obtenerSuscripcion(nombre);
      if (this.suscripcionService.esAdmin(interaction.user.id, suscripcion as unknown as Suscripcion)) {
        await interaction.editReply({ content: '❌ Usa `/suscripcion unirse` para unirte tú mismo.' });
        return;
      }
    }

    await this.suscripcionService.agregar(nombre, interaction.user.id, usuario.id);

    await interaction.editReply({
      content: `✅ Se agregó a **${usuario.tag}** a la suscripción **${nombre}**.`,
    });
  }

  private async handleRemover(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const nombre = interaction.options.getString('nombre', true);
    const usuario = interaction.options.getUser('usuario', true);

    await this.suscripcionService.remover(nombre, interaction.user.id, usuario.id);

    await interaction.editReply({
      content: `✅ Se removió a **${usuario.tag}** de la suscripción **${nombre}**.`,
    });
  }

  private async handleEstado(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const nombre = interaction.options.getString('nombre', true);
    const estado = await this.suscripcionService.obtenerEstado(nombre);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Estado de ${estado.nombre}`)
      .setColor(0x5865f2)
      .addFields(
        { name: '💰 Cuota por persona', value: `$${estado.cuotaPorPersona.toFixed(2)}`, inline: true },
        { name: '🏷️ Cupos', value: `${estado.cuposUsados}/${estado.limiteUsuarios}`, inline: true },
        { name: '📅 Monto total', value: `$${estado.montoTotal.toFixed(2)}`, inline: true },
      );

    if (estado.miembros.length > 0) {
      const lista = estado.miembros
        .map((m) => {
          const icono = m.estado === 'ADELANTADO' ? '💎' : '🔴';
          return `${icono} <@${m.usuarioDiscordId}> — ${m.estado === 'ADELANTADO' ? `${m.mesesAFavor} mes(es) a favor` : 'Pendiente'}`;
        })
        .join('\n');
      embed.addFields({ name: '👥 Miembros', value: lista });
    } else {
      embed.addFields({ name: '👥 Miembros', value: 'Sin miembros aún' });
    }

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleHistorial(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const nombre = interaction.options.getString('nombre', true);
    const { timeline, resumen } = await this.suscripcionService.obtenerHistorial(nombre, interaction.user.id);

    const lineas = [
      '📋 ESTADO TEMPORAL Y COBERTURA DE PAGOS',
      `Suscripción: ${nombre} | Usuario: @${interaction.user.displayName}`,
      '',
      '-' .repeat(62),
      `${'Mes'.padEnd(13)} | ${'Estado'.padEnd(20)} | ${'Fecha Pago'.padEnd(11)} | Detalle`,
      '-' .repeat(62),
      ...timeline.map(
        (r) => `${r.mes.padEnd(13)} | ${r.estado.padEnd(20)} | ${r.fechaPago.padEnd(11)} | ${r.detalle}`,
      ),
      '-' .repeat(62),
      '',
      `📊 Resumen: ${resumen}`,
    ];

    const embed = new EmbedBuilder()
      .setTitle(`📋 Historial de Pagos — ${nombre}`)
      .setColor(0x5865f2)
      .setDescription(`\`\`\`\n${lineas.join('\n')}\n\`\`\``);

    await interaction.editReply({ embeds: [embed] });
  }

  private async handlePagar(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const nombreSusc = interaction.options.getString('suscripcion', true);
    const usuario = interaction.options.getUser('usuario', true);
    const meses = interaction.options.getInteger('meses', true);

    const { montoPagado } = await this.suscripcionService.pagar(nombreSusc, interaction.user.id, usuario.id, meses);

    await interaction.editReply({
      content: [
        `✅ Pago registrado para **${usuario.tag}** en **${nombreSusc}**.`,
        `**Monto:** $${montoPagado.toFixed(2)}`,
        `**Meses cubiertos:** ${meses}`,
      ].join('\n'),
    });
  }
}
