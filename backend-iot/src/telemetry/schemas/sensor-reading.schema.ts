import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Schema SensorReading - cada lectura que manda un sensor IoT por MQTT.
 *
 * TODO: Definir propiedades con @Prop():
 *   - sensorId (string, required) - ej. "esp32-puerta-principal"
 *   - tipo (string) - temperatura | humedad | movimiento | puerta | etc.
 *   - valor (number, required)
 *   - unidad (string, optional) - ej. "°C", "%"
 *   - fecha (Date, default now, indexed)
 *   - metadata (Mixed, optional) - payload completo del mensaje
 */
@Schema({ collection: 'sensor_readings', timestamps: true })
export class SensorReading {
  // TODO: implementar propiedades con @Prop().
}

export type SensorReadingDocument = HydratedDocument<SensorReading>;
export const SensorReadingSchema = SchemaFactory.createForClass(SensorReading);
