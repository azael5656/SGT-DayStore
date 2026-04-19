import { Injectable } from '@nestjs/common';

/**
 * Servicio de telemetria.
 * Consulta las lecturas de sensores guardadas en MongoDB.
 * Las lecturas las genera automaticamente el ESP32 y las escribe via MQTT,
 * pero el almacenamiento en BD lo hace este servicio escuchando el handler
 * de MqttService.
 *
 * TODO: inyectar @InjectModel(SensorReading.name), implementar
 * guardarLectura() que sera llamado desde el handler de MQTT.
 */
@Injectable()
export class TelemetryService {
  async findLatest() {
    // TODO: agregar las ultimas lecturas de cada sensor con pipeline Mongo.
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

  async getDashboard() {
    // TODO: construir el resumen que ve el dueño en la pantalla principal.
    return {
      temperaturaActual: 22.5,
      humedadActual: 58,
      puertaAbierta: false,
      movimientoUltimoMinuto: false,
      sensoresActivos: 5,
      alertasSinRevisar: 2,
    };
  }

  async getHistory(sensorId: string) {
    // TODO: devolver las lecturas del sensor ordenadas por fecha desc.
    return {
      sensorId,
      lecturas: [
        { valor: 22.5, fecha: new Date().toISOString() },
        { valor: 22.7, fecha: new Date(Date.now() - 60_000).toISOString() },
      ],
    };
  }
}
