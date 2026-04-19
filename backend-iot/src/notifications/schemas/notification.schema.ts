import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Schema Notification - historial de notificaciones push enviadas a los
 * usuarios. Se crea una por cada alerta relevante que se quiera avisar.
 *
 * TODO: Definir propiedades con @Prop():
 *   - userId (string, required, indexed)
 *   - titulo (string)
 *   - cuerpo (string)
 *   - alertaId (string, nullable) - ref a la alerta que la origino
 *   - leida (boolean, default false)
 *   - leidaEn (Date, nullable)
 *   - fecha (Date, default now)
 */
@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  // TODO: implementar propiedades con @Prop().
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
