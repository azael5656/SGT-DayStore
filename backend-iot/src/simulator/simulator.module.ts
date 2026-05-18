import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';

/**
 * Modulo del simulador de escenarios.
 *
 * NOTA: el SimulatorController quedo desregistrado a proposito para que en
 * el modo "datos reales ESP32" no quede expuesto POST /simulator/escenario/*.
 * El SimulatorService sigue exportado porque AlertsService lo inyecta para
 * llamar stopIfActive() al reconocer alertas; con el burst inactivo es un
 * no-op seguro.
 *
 * Para reactivar el simulador (demos sin hardware), volver a poner
 * SimulatorController en `controllers`.
 *
 * Depende de:
 *  - SharedModule (global) -> InMemoryStoreService
 *  - MqttModule (global)   -> MqttService
 */
@Module({
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
