import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Severidad,
  StoredAlert,
} from '../shared/in-memory-store.service';
import { Alert, AlertDocument } from './schemas/alert.schema';

/**
 * Persistencia de alertas en MongoDB. Aísla a AlertsService de Mongoose.
 * La clave de upsert es `alertId` (el id del store), así una alerta que se
 * refresca (dedupe por tipo) o se reconoce actualiza el mismo documento.
 */
@Injectable()
export class AlertsRepository {
  constructor(
    @InjectModel(Alert.name)
    private readonly model: Model<AlertDocument>,
  ) {}

  /** Crea o actualiza la alerta por su `alertId`. */
  upsert(a: StoredAlert) {
    return this.model
      .updateOne(
        { alertId: a.id },
        {
          $set: {
            alertId: a.id,
            tipo: a.tipo,
            severidad: a.severidad,
            mensaje: a.mensaje,
            reconocida: a.reconocida,
            reconocidaPor: a.reconocidaPor ?? null,
            reconocidaEn: a.reconocidaEn ? new Date(a.reconocidaEn) : null,
            fecha: new Date(a.fecha),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  /** Alertas sin reconocer (las que deben resucitar al reiniciar el backend). */
  async findNoReconocidas(limit = 100): Promise<StoredAlert[]> {
    const docs = await this.model
      .find({ reconocida: false })
      .sort({ fecha: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((d) => ({
      id: d.alertId,
      tipo: d.tipo,
      severidad: d.severidad as Severidad,
      mensaje: d.mensaje,
      reconocida: d.reconocida,
      fecha: new Date(d.fecha).toISOString(),
      reconocidaPor: d.reconocidaPor ?? undefined,
      reconocidaEn: d.reconocidaEn
        ? new Date(d.reconocidaEn).toISOString()
        : undefined,
    }));
  }

  /** Marca todas las no reconocidas como reconocidas (al limpiar alertas). */
  marcarTodasReconocidas() {
    return this.model
      .updateMany(
        { reconocida: false },
        {
          $set: {
            reconocida: true,
            reconocidaPor: 'sistema',
            reconocidaEn: new Date(),
          },
        },
      )
      .exec();
  }
}
