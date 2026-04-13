import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

/**
 * Modulo de telemetria.
 * Gestiona las lecturas de sensores IoT almacenadas en MongoDB.
 */
@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
