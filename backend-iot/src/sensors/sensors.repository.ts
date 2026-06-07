import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Reading, ReadingDocument } from './schemas/reading.schema';

interface HistoricoFilter {
  tipo?: string;
  sensorId?: string;
  desde?: string | Date;
  hasta?: string | Date;
  page: number;
  limit: number;
}

interface ReadingInput {
  sensorId: string;
  tipo: string;
  valor: number;
  unidad: string;
  fecha: string | Date;
}

/**
 * Capa de persistencia de lecturas de sensores en MongoDB. Aísla a
 * SensorsService de Mongoose: el service solo conoce métodos de negocio
 * (`listarHistorico`, `insertarLectura`).
 */
@Injectable()
export class SensorsRepository {
  constructor(
    @InjectModel(Reading.name)
    private readonly readingModel: Model<ReadingDocument>,
  ) {}

  async findHistorico(filter: HistoricoFilter) {
    const where: FilterQuery<ReadingDocument> = {};
    if (filter.tipo) where.tipo = filter.tipo;
    if (filter.sensorId) where.sensorId = filter.sensorId;
    if (filter.desde || filter.hasta) {
      where.fecha = {};
      if (filter.desde) where.fecha.$gte = new Date(filter.desde);
      if (filter.hasta) where.fecha.$lte = new Date(filter.hasta);
    }
    const [items, total] = await Promise.all([
      this.readingModel
        .find(where)
        .sort({ fecha: -1 })
        .skip((filter.page - 1) * filter.limit)
        .limit(filter.limit)
        .lean()
        .exec(),
      this.readingModel.countDocuments(where).exec(),
    ]);
    return { items, total };
  }

  insertReading(input: ReadingInput) {
    return this.readingModel.create({
      sensorId: input.sensorId,
      tipo: input.tipo,
      valor: input.valor,
      unidad: input.unidad,
      fecha: typeof input.fecha === 'string' ? new Date(input.fecha) : input.fecha,
    });
  }
}
