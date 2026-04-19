import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MockPublisherService } from './mock-publisher.service';
import {
  SensorConfig,
  SensorConfigSchema,
} from './schemas/sensor-config.schema';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

/**
 * Modulo de configuracion de sensores IoT.
 *
 * MockPublisherService se registra siempre pero solo se activa cuando la
 * variable de entorno MOCK_SENSORS=true (ver su constructor). En produccion
 * con ESP32 real basta con no definir la variable para dejarlo inerte.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SensorConfig.name, schema: SensorConfigSchema },
    ]),
  ],
  controllers: [SensorsController],
  providers: [SensorsService, MockPublisherService],
  exports: [SensorsService],
})
export class SensorsModule {}
