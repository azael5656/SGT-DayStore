import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';

/**
 * Módulo de simulación para demo/dev.
 *
 * Depende de:
 *  - SharedModule (global) → InMemoryStoreService
 *  - MqttModule (global)   → MqttService
 */
@Module({
  controllers: [SimulatorController],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
