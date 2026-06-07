import { Injectable } from '@nestjs/common';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Servicio de telemetria.
 *
 * Lee del InMemoryStoreService, que es donde MqttService deposita las
 * lecturas reales del ESP32 (firmware en infra/hardware/firmware/main.ino).
 *
 * Si el store esta vacio (ESP32 apagado o sin red) devolvemos arreglos
 * vacios / ceros: NO inventamos datos. El movil debe interpretar "0
 * sensoresActivos" como "no hay telemetria".
 *
 * TODO: cuando se implemente @InjectModel(SensorReading.name), preferir
 * Mongo y dejar el store solo como cache.
 */
@Injectable()
export class TelemetryService {
  constructor(private readonly store: InMemoryStoreService) {}

  async findLatest() {
    return this.store.getReadings();
  }

  async getDashboard() {
    const temperatura = this.store.getLatestByTipo('temperatura');
    const humedad = this.store.getLatestByTipo('humedad');
    const puerta = this.store.getLatestByTipo('puerta');
    const movimiento = this.store.getLatestByTipo('movimiento');
    const haceUnMinuto = Date.now() - 60_000;

    return {
      temperaturaActual: temperatura?.valor ?? 0,
      humedadActual: humedad?.valor ?? 0,
      puertaAbierta: puerta?.valor === 1,
      movimientoUltimoMinuto: Boolean(
        movimiento &&
          movimiento.valor === 1 &&
          new Date(movimiento.fecha).getTime() >= haceUnMinuto,
      ),
      sensoresActivos: this.store.getReadings().length,
      alertasSinRevisar: this.store
        .getAlerts()
        .filter((a) => !a.reconocida).length,
    };
  }

  async getHistory(sensorId: string) {
    const actual = this.store.getReading(sensorId);
    if (!actual) {
      return { sensorId, lecturas: [] };
    }
    // TODO: cuando haya Mongo devolver la serie temporal real. Por ahora
    // solo la ultima lectura.
    return {
      sensorId,
      lecturas: [{ valor: actual.valor, fecha: actual.fecha }],
    };
  }
}
