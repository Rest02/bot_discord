import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Client } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DISCORD_CLIENT } from '../discord/constants.js';
import { SuscripcionService } from './suscripcion.service.js';
import type { Suscripcion } from '../generated/prisma/client.js';

@Injectable()
export class SuscripcionJob {
  private readonly logger = new Logger(SuscripcionJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly suscripcionService: SuscripcionService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {}

  @Cron('0 12 * * *')
  async recordatorioPago(): Promise<void> {
    this.logger.log('Ejecutando revisión de recordatorios de pago...');

    const suscripciones = await this.prisma.suscripcion.findMany();
    const hoy = new Date();
    const diaHoy = hoy.getDate();

    for (const suscripcion of suscripciones) {
      try {
        const diaRecordatorio = this.calcularDiaRecordatorio(suscripcion.diaCobro, hoy);
        if (diaRecordatorio !== diaHoy) continue;

        if (!suscripcion.canalRecordatorio) {
          this.logger.warn(`Suscripción "${suscripcion.nombre}" no tiene canal de recordatorio configurado`);
          continue;
        }

        const miembrosPendientes = await this.suscripcionService.obtenerMiembrosPendientes(suscripcion.id);

        if (miembrosPendientes.length === 0) continue;

        const menciones = miembrosPendientes.map((m) => `<@${m.usuarioDiscordId}>`).join(' ');
        const channel = await this.client.channels.fetch(suscripcion.canalRecordatorio).catch(() => null);

        if (!channel || !('send' in channel)) {
          this.logger.warn(`No se pudo obtener el canal ${suscripcion.canalRecordatorio} para "${suscripcion.nombre}"`);
          continue;
        }

        await channel.send({
          content:
            `🔔 **Recordatorio de pago — ${suscripcion.nombre}**\n` +
            `Faltan 3 días para el cobro (día ${suscripcion.diaCobro}).\n\n` +
            `Los siguientes miembros están **pendientes de pago**:\n${menciones}`,
        });

        this.logger.log(`Recordatorio enviado para "${suscripcion.nombre}" a ${miembrosPendientes.length} miembro(s)`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error procesando recordatorio para "${suscripcion.nombre}": ${msg}`);
      }
    }

    this.logger.log('Revisión de recordatorios completada');
  }

  @Cron('0 6 * * *')
  async cierreMensual(): Promise<void> {
    this.logger.log('Ejecutando cierre de ciclo mensual...');

    const suscripciones = await this.prisma.suscripcion.findMany();
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const diaAyer = ayer.getDate();

    for (const suscripcion of suscripciones) {
      try {
        if (suscripcion.diaCobro !== diaAyer) continue;

        await this.suscripcionService.descontarMes(suscripcion.id);

        this.logger.log(`Cierre ejecutado para "${suscripcion.nombre}" (día cobro: ${suscripcion.diaCobro})`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error en cierre para "${suscripcion.nombre}": ${msg}`);
      }
    }

    this.logger.log('Cierre de ciclo mensual completado');
  }

  private calcularDiaRecordatorio(diaCobro: number, fechaReferencia: Date): number {
    const fechaRecordatorio = new Date(fechaReferencia);
    fechaRecordatorio.setDate(diaCobro - 3);
    return fechaRecordatorio.getDate();
  }
}
