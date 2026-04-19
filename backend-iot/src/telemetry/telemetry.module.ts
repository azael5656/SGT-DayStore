import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SensorReading,
  SensorReadingSchema,
} from './schemas/sensor-reading.schema';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

/**
 * Modulo de telemetria.
 * Registra el schema SensorReading para poder guardar y consultar lecturas.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SensorReading.name, schema: SensorReadingSchema },
    ]),
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
