import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';

/**
 * Modulo del simulador de escenarios.
 *
 * SimulatorController expone POST /simulator/escenario/{incendio|forzado|
 * corte_luz|normal} para demos sin hardware.
 *
 * Depende de:
 *  - SharedModule (global) -> InMemoryStoreService
 *  - MqttModule (global)   -> MqttService
 */
@Module({
  controllers: [SimulatorController],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
