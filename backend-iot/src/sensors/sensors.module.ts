import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MockPublisherService } from './mock-publisher.service';
import { Reading, ReadingSchema } from './schemas/reading.schema';
import {
  SensorConfig,
  SensorConfigSchema,
} from './schemas/sensor-config.schema';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SensorConfig.name, schema: SensorConfigSchema },
      { name: Reading.name, schema: ReadingSchema },
    ]),
  ],
  controllers: [SensorsController],
  providers: [SensorsService, MockPublisherService],
  exports: [SensorsService],
})
export class SensorsModule {}
