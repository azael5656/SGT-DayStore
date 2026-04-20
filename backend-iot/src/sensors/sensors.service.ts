import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  InMemoryStoreService,
  StoredReading,
} from '../shared/in-memory-store.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { QueryHistoricoDto } from './dto/query-historico.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { Reading, ReadingDocument } from './schemas/reading.schema';

/**
 * CRUD del catalogo de sensores + acceso al historico de lecturas.
 *
 * Catalogo (sensors): mockeado mientras los compañeros implementan
 * SensorConfig en Mongo.
 * Historico (readings): real, escrito por InMemoryStoreService cuando
 * llega una lectura via simulator o MQTT.
 */
@Injectable()
export class SensorsService implements OnModuleInit {
  constructor(
    @InjectModel(Reading.name)
    private readonly readingModel: Model<ReadingDocument>,
    private readonly store: InMemoryStoreService,
  ) {}

  onModuleInit(): void {
    // Persistir cada lectura nueva sin acoplar al simulador/MockPublisher.
    this.store.events.on('reading', (r: StoredReading) => {
      void this.insertarLectura(r);
    });
  }

  async findAll() {
    return [
      {
        sensorId: 'dht22-ambiente',
        nombre: 'Sensor ambiental',
        tipo: 'temperatura',
        ubicacion: 'centro tienda',
        activo: true,
      },
    ];
  }

  async findOne(sensorId: string) {
    return {
      sensorId,
      nombre: 'Sensor de prueba',
      tipo: 'temperatura',
      ubicacion: 'bodega',
      activo: true,
    };
  }

  async create(dto: CreateSensorDto) {
    return { ...dto, activo: dto.activo ?? true };
  }

  async update(sensorId: string, dto: UpdateSensorDto) {
    return { sensorId, ...dto };
  }

  async remove(sensorId: string) {
    return { mensaje: `Sensor ${sensorId} desactivado` };
  }

  async listarHistorico(query: QueryHistoricoDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const filter: FilterQuery<ReadingDocument> = {};
    if (query.tipo) filter.tipo = query.tipo;
    if (query.sensorId) filter.sensorId = query.sensorId;
    if (query.desde || query.hasta) {
      filter.fecha = {};
      if (query.desde) filter.fecha.$gte = new Date(query.desde);
      if (query.hasta) filter.fecha.$lte = new Date(query.hasta);
    }
    const [items, total] = await Promise.all([
      this.readingModel
        .find(filter)
        .sort({ fecha: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.readingModel.countDocuments(filter).exec(),
    ]);
    return {
      items: items.map((d) => ({
        sensorId: d.sensorId,
        tipo: d.tipo,
        valor: d.valor,
        unidad: d.unidad,
        fecha: d.fecha,
      })),
      total,
      page,
      limit,
    };
  }

  async insertarLectura(lectura: {
    sensorId: string;
    tipo: string;
    valor: number;
    unidad: string;
    fecha: string | Date;
  }) {
    try {
      await this.readingModel.create({
        sensorId: lectura.sensorId,
        tipo: lectura.tipo,
        valor: lectura.valor,
        unidad: lectura.unidad,
        fecha:
          typeof lectura.fecha === 'string'
            ? new Date(lectura.fecha)
            : lectura.fecha,
      });
    } catch {
      // No queremos romper el flujo realtime si Mongo esta caido.
    }
  }
}
