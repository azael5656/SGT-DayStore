import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Schema StoreConfig - parametros de la tienda (suele haber un solo documento).
 *
 * TODO: Definir propiedades con @Prop():
 *   - horarioApertura (string) - ej. "08:00"
 *   - horarioCierre (string) - ej. "20:00"
 *   - zonaHoraria (string) - ej. "America/Bogota"
 *   - modoNocturno (boolean, default false)
 *   - umbralesAlerta (Mixed) - valores para decidir si una lectura dispara alerta
 */
@Schema({ collection: 'store_config', timestamps: true })
export class StoreConfig {
  // TODO: implementar propiedades con @Prop().
}

export type StoreConfigDocument = HydratedDocument<StoreConfig>;
export const StoreConfigSchema = SchemaFactory.createForClass(StoreConfig);
