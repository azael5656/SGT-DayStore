import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Schema SensorConfig - configuracion de cada sensor fisico instalado.
 *
 * TODO: Definir propiedades con @Prop():
 *   - sensorId (string, unique, required) - identificador fisico
 *   - nombre (string) - ej. "Puerta principal"
 *   - tipo (string) - temperatura | puerta | movimiento | etc.
 *   - ubicacion (string) - ej. "bodega", "entrada"
 *   - umbrales (Mixed) - valores min/max para generar alertas
 *   - activo (boolean, default true)
 */
@Schema({ collection: 'sensors', timestamps: true })
export class SensorConfig {
  // TODO: implementar propiedades con @Prop().
}

export type SensorConfigDocument = HydratedDocument<SensorConfig>;
export const SensorConfigSchema = SchemaFactory.createForClass(SensorConfig);
