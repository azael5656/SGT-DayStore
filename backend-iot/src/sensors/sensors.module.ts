import { Module } from '@nestjs/common';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

/**
 * Modulo de sensores.
 * Gestiona la configuracion de sensores IoT en MongoDB.
 */
@Module({
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
