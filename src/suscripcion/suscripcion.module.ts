import { Module } from '@nestjs/common';
import { SuscripcionService } from './suscripcion.service.js';
import { SuscripcionCommand } from './suscripcion.command.js';
import { SuscripcionJob } from './suscripcion.job.js';

@Module({
  providers: [SuscripcionService, SuscripcionCommand, SuscripcionJob],
})
export class SuscripcionModule {}
