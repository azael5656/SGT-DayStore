import { Injectable } from '@nestjs/common';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Servicio de telemetria.
 *
 * Estado actual: mientras la persistencia en Mongo sigue como TODO (ver
 * sensor-reading.schema.ts del PR #2), leemos del InMemoryStoreService,
 * que es donde MockPublisherService deja sus lecturas en vivo.
 *
 * Si el store está vacío (ej. backend arrancó sin MOCK_SENSORS=true y aún
 * no llegó ningún ESP32 real), respondemos con datos mock estáticos para
 * que el móvil no se rompa en blanco.
 *
 * TODO: cuando se implemente @InjectModel(SensorReading.name), preferir
 * Mongo y dejar el store solo como cache.
 */
@Injectable()
export class TelemetryService {
  constructor(private readonly store: InMemoryStoreService) {}

  async findLatest() {
    if (this.store.isEmpty()) return this.mockLatest();
    return this.store.getReadings();
  }

  async getDashboard() {
    if (this.store.isEmpty()) return this.mockDashboard();

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
      // Fallback: histórico mock.
      return {
        sensorId,
        lecturas: [
          { valor: 22.5, fecha: new Date().toISOString() },
          { valor: 22.7, fecha: new Date(Date.now() - 60_000).toISOString() },
        ],
      };
    }
    // TODO: cuando haya Mongo devolver la serie temporal real. Por ahora
    // solo la última lectura.
    return {
      sensorId,
      lecturas: [{ valor: actual.valor, fecha: actual.fecha }],
    };
  }

  private mockLatest() {
    return [
      {
        sensorId: 'esp32-temperatura-bodega',
        tipo: 'temperatura',
        valor: 22.5,
        unidad: '°C',
        fecha: new Date().toISOString(),
      },
      {
        sensorId: 'esp32-puerta-principal',
        tipo: 'puerta',
        valor: 0,
        unidad: 'estado',
        fecha: new Date().toISOString(),
      },
    ];
  }

  private mockDashboard() {
    return {
      temperaturaActual: 22.5,
      humedadActual: 58,
      puertaAbierta: false,
      movimientoUltimoMinuto: false,
      sensoresActivos: 0,
      alertasSinRevisar: 0,
    };
  }
}
