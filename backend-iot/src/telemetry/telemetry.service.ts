import { Injectable } from '@nestjs/common';

/**
 * Servicio de telemetria.
 * Almacena y consulta lecturas de sensores IoT.
 * Las lecturas las genera el ESP32 automaticamente via MQTT.
 *
 * TODO: Implementar almacenamiento en MongoDB y consultas de historial
 */
@Injectable()
export class TelemetryService {}
