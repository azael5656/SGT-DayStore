import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Schema Alert — alertas generadas por los sensores de la tienda, persistidas
 * en Mongo para que sobrevivan reinicios del backend (antes vivían solo en
 * InMemoryStoreService y se perdían).
 *
 * `alertId` es el id que genera el store (uuid); lo usamos como clave de
 * upsert para no duplicar cuando una alerta se refresca o se reconoce.
 */
@Schema({ collection: 'alerts', timestamps: true })
export class Alert {
  @Prop({ required: true, unique: true, index: true })
  alertId!: string;

  @Prop({ required: true, index: true })
  tipo!: string;

  @Prop({ required: true })
  severidad!: string;

  @Prop({ required: true })
  mensaje!: string;

  @Prop({ default: false, index: true })
  reconocida!: boolean;

  @Prop({ type: String, default: null })
  reconocidaPor!: string | null;

  @Prop({ type: Date, default: null })
  reconocidaEn!: Date | null;

  @Prop({ required: true, index: true })
  fecha!: Date;
}

export type AlertDocument = HydratedDocument<Alert>;
export const AlertSchema = SchemaFactory.createForClass(Alert);
