import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Configuracion de la tienda (un solo documento).
 *
 * Reglas "esta cerrado ahora" (orden de evaluacion):
 *  1. modoNocturno === true                                    -> cerrado
 *  2. vacacionesHasta (YYYY-MM-DD) >= hoy                      -> cerrado
 *  3. hoy (0=dom..6=sab) esta en diasCerrados                  -> cerrado
 *  4. cerrarHoyA (HH:MM) seteado y hora actual >= cerrarHoyA   -> cerrado
 *  5. hora actual < horarioApertura || >= horarioCierre        -> cerrado
 *  Si no, abierto.
 */
@Schema({ collection: 'store_config', timestamps: true })
export class StoreConfig {
  @Prop({ default: '09:00' })
  horarioApertura!: string;

  @Prop({ default: '20:00' })
  horarioCierre!: string;

  @Prop({ default: 'America/Bogota' })
  zonaHoraria!: string;

  /** Fuerza "cerrado" ahora mismo, ignorando horario. */
  @Prop({ default: false })
  modoNocturno!: boolean;

  /** Fuerza "abierto" ahora mismo, ignorando horario. Gana sobre todo lo demas. */
  @Prop({ default: false })
  abiertoForzado!: boolean;

  /** YYYY-MM-DD. Si >= hoy, la tienda esta de vacaciones hasta ese dia inclusive. */
  @Prop({ type: String, default: null })
  vacacionesHasta!: string | null;

  /** HH:MM. Cierre temprano solo para el dia de cerrarHoyFecha. */
  @Prop({ type: String, default: null })
  cerrarHoyA!: string | null;

  /** YYYY-MM-DD en que se registro cerrarHoyA. Se ignora si es de otro dia. */
  @Prop({ type: String, default: null })
  cerrarHoyFecha!: string | null;

  /** 0=Domingo, 1=Lunes, ..., 6=Sabado. */
  @Prop({ type: [Number], default: [] })
  diasCerrados!: number[];

  @Prop({
    type: Object,
    default: { temperaturaMax: 28, humedadMax: 80 },
  })
  umbralesAlerta!: { temperaturaMax: number; humedadMax: number };
}

export type StoreConfigDocument = HydratedDocument<StoreConfig>;
export const StoreConfigSchema = SchemaFactory.createForClass(StoreConfig);
