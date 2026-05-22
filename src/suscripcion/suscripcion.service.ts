import { Inject, Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Client } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DISCORD_CLIENT } from '../discord/constants.js';
import { CrearSuscripcionDto } from './dto/crear-suscripcion.dto.js';
import type { Suscripcion, MiembroSuscripcion, HistorialPago } from '../generated/prisma/client.js';

interface TimelineRow {
  mes: string;
  estado: string;
  fechaPago: string;
  detalle: string;
}

interface EstadoData {
  nombre: string;
  montoTotal: number;
  cuotaPorPersona: number;
  cuposUsados: number;
  limiteUsuarios: number;
  miembros: { usuarioDiscordId: string; estado: string; mesesAFavor: number }[];
}

@Injectable()
export class SuscripcionService {
  private readonly logger = new Logger(SuscripcionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
  ) {}

  async crear(dto: CrearSuscripcionDto, adminDiscordId: string): Promise<Suscripcion> {
    const existing = await this.prisma.suscripcion.findUnique({ where: { nombre: dto.nombre } });
    if (existing) {
      throw new BadRequestException(`Ya existe una suscripción llamada "${dto.nombre}"`);
    }

    return this.prisma.suscripcion.create({
      data: {
        nombre: dto.nombre,
        montoTotal: dto.montoTotal,
        diaCobro: dto.diaCobro,
        limiteUsuarios: dto.limiteUsuarios,
        adminDiscordId,
        canalRecordatorio: dto.canalRecordatorio ?? null,
      },
    }) as unknown as Suscripcion;
  }

  async modificar(nombre: string, nuevoMontoTotal: number): Promise<Suscripcion> {
    const suscripcion = await this.obtenerSuscripcion(nombre);
    return this.prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { montoTotal: nuevoMontoTotal },
    }) as unknown as Suscripcion;
  }

  async unirse(nombreSusc: string, usuarioDiscordId: string): Promise<MiembroSuscripcion> {
    const suscripcion = await this.obtenerSuscripcion(nombreSusc);

    const miembrosActuales = await this.prisma.miembroSuscripcion.count({
      where: { suscripcionId: suscripcion.id },
    });

    if (miembrosActuales >= suscripcion.limiteUsuarios) {
      throw new BadRequestException(
        `La suscripción "${nombreSusc}" ya alcanzó su límite de ${suscripcion.limiteUsuarios} usuarios`,
      );
    }

    const yaMiembro = await this.prisma.miembroSuscripcion.findUnique({
      where: { suscripcionId_usuarioDiscordId: { suscripcionId: suscripcion.id, usuarioDiscordId } },
    });

    if (yaMiembro) {
      throw new BadRequestException('Ya eres miembro de esta suscripción');
    }

    return this.prisma.miembroSuscripcion.create({
      data: {
        suscripcionId: suscripcion.id,
        usuarioDiscordId,
      },
    }) as unknown as MiembroSuscripcion;
  }

  async agregar(nombreSusc: string, adminDiscordId: string, usuarioDiscordId: string): Promise<MiembroSuscripcion> {
    const suscripcion = await this.verificarAdmin(nombreSusc, adminDiscordId);

    const miembrosActuales = await this.prisma.miembroSuscripcion.count({
      where: { suscripcionId: suscripcion.id },
    });

    if (miembrosActuales >= suscripcion.limiteUsuarios) {
      throw new BadRequestException(
        `La suscripción "${nombreSusc}" ya alcanzó su límite de ${suscripcion.limiteUsuarios} usuarios`,
      );
    }

    const yaMiembro = await this.prisma.miembroSuscripcion.findUnique({
      where: { suscripcionId_usuarioDiscordId: { suscripcionId: suscripcion.id, usuarioDiscordId } },
    });

    if (yaMiembro) {
      throw new BadRequestException('El usuario ya es miembro de esta suscripción');
    }

    return this.prisma.miembroSuscripcion.create({
      data: {
        suscripcionId: suscripcion.id,
        usuarioDiscordId,
      },
    }) as unknown as MiembroSuscripcion;
  }

  async remover(nombreSusc: string, adminDiscordId: string, usuarioDiscordId: string): Promise<void> {
    const suscripcion = await this.verificarAdmin(nombreSusc, adminDiscordId);

    const miembro = await this.prisma.miembroSuscripcion.findUnique({
      where: { suscripcionId_usuarioDiscordId: { suscripcionId: suscripcion.id, usuarioDiscordId } },
    });

    if (!miembro) {
      throw new NotFoundException('El usuario no es miembro de esta suscripción');
    }

    await this.prisma.miembroSuscripcion.delete({ where: { id: miembro.id } });
  }

  async pagar(
    nombreSusc: string,
    adminDiscordId: string,
    usuarioDiscordId: string,
    meses: number,
  ): Promise<{ montoPagado: number }> {
    const suscripcion = await this.verificarAdmin(nombreSusc, adminDiscordId);

    const miembro = await this.prisma.miembroSuscripcion.findUnique({
      where: { suscripcionId_usuarioDiscordId: { suscripcionId: suscripcion.id, usuarioDiscordId } },
    });

    if (!miembro) {
      throw new NotFoundException('El usuario no es miembro de esta suscripción');
    }

    const miembrosActivos = await this.prisma.miembroSuscripcion.count({
      where: { suscripcionId: suscripcion.id },
    });

    const montoPagado = Number(suscripcion.montoTotal) / miembrosActivos * meses;

    await this.prisma.historialPago.create({
      data: {
        miembroSuscripcionId: miembro.id,
        montoPagado,
        mesesCubiertos: meses,
      },
    });

    await this.prisma.miembroSuscripcion.update({
      where: { id: miembro.id },
      data: { mesesAFavor: { increment: meses } },
    });

    await this.enviarDM(usuarioDiscordId, nombreSusc, montoPagado, meses);

    return { montoPagado };
  }

  async obtenerEstado(nombreSusc: string): Promise<EstadoData> {
    const suscripcion = await this.obtenerSuscripcion(nombreSusc);

    const miembros = await this.prisma.miembroSuscripcion.findMany({
      where: { suscripcionId: suscripcion.id },
    });

    const miembrosActivos = miembros.length;
    const montoTotal = Number(suscripcion.montoTotal);
    const cuotaPorPersona = miembrosActivos > 0 ? montoTotal / miembrosActivos : 0;

    const miembrosConEstado = miembros.map((m) => ({
      usuarioDiscordId: m.usuarioDiscordId,
      estado: m.mesesAFavor > 0 ? 'ADELANTADO' : 'PENDIENTE',
      mesesAFavor: m.mesesAFavor,
    }));

    return {
      nombre: suscripcion.nombre,
      montoTotal,
      cuotaPorPersona,
      cuposUsados: miembrosActivos,
      limiteUsuarios: suscripcion.limiteUsuarios,
      miembros: miembrosConEstado,
    };
  }

  async obtenerHistorial(nombreSusc: string, usuarioDiscordId: string): Promise<{ timeline: TimelineRow[]; resumen: string }> {
    const suscripcion = await this.obtenerSuscripcion(nombreSusc);

    const miembro = await this.prisma.miembroSuscripcion.findUnique({
      where: { suscripcionId_usuarioDiscordId: { suscripcionId: suscripcion.id, usuarioDiscordId } },
      include: {
        historial: { orderBy: { fechaPago: 'asc' } },
      },
    });

    if (!miembro) {
      throw new NotFoundException('No eres miembro de esta suscripción');
    }

    const mesesAFavor = miembro.mesesAFavor;
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const añoActual = ahora.getFullYear();
    const historial = miembro.historial as unknown as (HistorialPago & { fechaPago: Date })[];

    const timeline: TimelineRow[] = [];
    let pagosUsados = 0;
    let mesesContados = 0;

    for (let i = 0; i <= mesesAFavor; i++) {
      const fecha = new Date(añoActual, mesActual + i, 1);
      const labelMes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const mesCapitalizado = labelMes.charAt(0).toUpperCase() + labelMes.slice(1);

      if (i === 0) {
        timeline.push({
          mes: mesCapitalizado,
          estado: '[🟢 AL DÍA]',
          fechaPago: this.formatearFecha(historial, pagosUsados),
          detalle: 'Mes Actual',
        });
      } else if (i <= mesesAFavor) {
        mesesContados++;
        timeline.push({
          mes: mesCapitalizado,
          estado: '[💎 ADELANTADO]',
          fechaPago: this.formatearFecha(historial, pagosUsados),
          detalle: 'Pago por Adelantado',
        });
      }
    }

    const fechaSiguiente = new Date(añoActual, mesActual + mesesAFavor + 1, 1);
    const labelSiguiente = fechaSiguiente.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const siguienteCapitalizado = labelSiguiente.charAt(0).toUpperCase() + labelSiguiente.slice(1);

    timeline.push({
      mes: siguienteCapitalizado,
      estado: '[🔴 PENDIENTE]',
      fechaPago: '--',
      detalle: 'Requiere Pago',
    });

    return {
      timeline,
      resumen: mesesAFavor > 0
        ? `Tienes ${mesesAFavor} mes${mesesAFavor !== 1 ? 'es' : ''} cubierto${mesesAFavor !== 1 ? 's' : ''} por adelantado.`
        : 'No tienes meses cubiertos por adelantado.',
    };
  }

  async obtenerMiembrosPendientes(suscripcionId: number): Promise<MiembroSuscripcion[]> {
    return this.prisma.miembroSuscripcion.findMany({
      where: { suscripcionId, mesesAFavor: 0 },
    }) as unknown as MiembroSuscripcion[];
  }

  async descontarMes(suscripcionId: number): Promise<void> {
    await this.prisma.miembroSuscripcion.updateMany({
      where: { suscripcionId, mesesAFavor: { gt: 0 } },
      data: { mesesAFavor: { decrement: 1 } },
    });
  }

  async obtenerSuscripcion(nombre: string): Promise<Suscripcion> {
    const suscripcion = await this.prisma.suscripcion.findUnique({ where: { nombre } });
    if (!suscripcion) {
      throw new NotFoundException(`No existe una suscripción llamada "${nombre}"`);
    }
    return suscripcion as unknown as Suscripcion;
  }

  async verificarAdmin(nombre: string, discordId: string): Promise<Suscripcion> {
    const suscripcion = await this.obtenerSuscripcion(nombre);
    if (suscripcion.adminDiscordId !== discordId) {
      throw new ForbiddenException('No eres el administrador de esta suscripción');
    }
    return suscripcion;
  }

  esAdmin(discordId: string, suscripcion: Suscripcion): boolean {
    return suscripcion.adminDiscordId === discordId;
  }

  private async enviarDM(usuarioDiscordId: string, nombreSusc: string, monto: number, meses: number): Promise<void> {
    try {
      const user = await this.client.users.fetch(usuarioDiscordId);
      await user.send(
        `✅ Se ha registrado tu pago para **${nombreSusc}**.\n` +
        `**Monto:** $${monto.toFixed(2)}\n` +
        `**Meses cubiertos:** ${meses}`,
      );
    } catch (error) {
      this.logger.warn(`No se pudo enviar MD a ${usuarioDiscordId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private formatearFecha(historial: (HistorialPago & { fechaPago: Date })[], pagosUsados: number): string {
    if (pagosUsados < historial.length) {
      const pago = historial[pagosUsados];
      const d = pago.fechaPago;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return '--';
  }
}
