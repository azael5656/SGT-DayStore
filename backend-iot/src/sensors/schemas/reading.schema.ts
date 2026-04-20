import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Lectura individual de un sensor. Persistida en Mongo para construir
 * el historico que ven admin y superadmin.
 *
 * TTL: el indice sobre `fecha` con expireAfterSeconds=604800 borra docs
 * mas viejos que 7 dias automaticamente. Mongo aguanta facil ~700k docs
 * con esta retencion (6 sensores cada 2-4s).
 */
@Schema({ collection: 'readings', timestamps: { createdAt: true, updatedAt: false } })
export class Reading {
  @Prop({ required: true, index: true })
  sensorId!: string;

  @Prop({ required: true, index: true })
  tipo!: string;

  @Prop({ required: true })
  valor!: number;

  @Prop()
  unidad!: string;

  @Prop({ required: true, index: true, expires: 604800 })
  fecha!: Date;
}

export type ReadingDocument = HydratedDocument<Reading>;
export const ReadingSchema = SchemaFactory.createForClass(Reading);
