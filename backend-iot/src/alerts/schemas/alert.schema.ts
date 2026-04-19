import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Schema Alert - alertas generadas por los sensores de la tienda.
 *
 * TODO: Definir propiedades con @Prop():
 *   - tipo (string) - vibracion | puerta | movimiento | temperatura | etc.
 *   - severidad (string) - baja | media | alta | critica
 *   - sensorId (string)
 *   - mensaje (string)
 *   - reconocida (boolean, default false)
 *   - reconocidaPor (string, nullable) - userId que la reconocio
 *   - reconocidaEn (Date, nullable)
 *   - fecha (Date, default now, indexed)
 */
@Schema({ collection: 'alerts', timestamps: true })
export class Alert {
  // TODO: implementar propiedades con @Prop().
}

export type AlertDocument = HydratedDocument<Alert>;
export const AlertSchema = SchemaFactory.createForClass(Alert);
