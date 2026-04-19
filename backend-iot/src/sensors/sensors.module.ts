import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SensorConfig,
  SensorConfigSchema,
} from './schemas/sensor-config.schema';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

/**
 * Modulo de configuracion de sensores IoT.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SensorConfig.name, schema: SensorConfigSchema },
    ]),
  ],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
