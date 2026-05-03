import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  InMemoryStoreService,
  StoredReading,
} from '../shared/in-memory-store.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { QueryHistoricoDto } from './dto/query-historico.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorsRepository } from './sensors.repository';

/**
 * CRUD del catálogo de sensores + acceso al histórico de lecturas.
 *
 * Catálogo (sensors): mockeado mientras los compañeros implementan
 * SensorConfig en Mongo.
 * Histórico (readings): real, persistido en Mongo a través de
 * SensorsRepository cuando llega una lectura via simulator o MQTT.
 */
@Injectable()
export class SensorsService implements OnModuleInit {
  constructor(
    private readonly repo: SensorsRepository,
    private readonly store: InMemoryStoreService,
  ) {}

  onModuleInit(): void {
    // Persistir cada lectura nueva sin acoplar al simulador/MockPublisher.
    this.store.events.on('reading', (r: StoredReading) => {
      void this.insertarLectura(r);
    });
  }

  /**
   * Lista el catálogo de sensores configurados.
   *
   * MOCK: retorna un único sensor de ejemplo. Pendiente: leer de la
   * colección `sensor_config` (Mongo) cuando se implemente el schema.
   */
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

  /**
   * Devuelve la configuración de un sensor por id.
   *
   * MOCK: retorna un sensor placeholder. Pendiente migrar a Mongo.
   */
  async findOne(sensorId: string) {
    return {
      sensorId,
      nombre: 'Sensor de prueba',
      tipo: 'temperatura',
      ubicacion: 'bodega',
      activo: true,
    };
  }

  /**
   * Registra un sensor nuevo en el catálogo.
   *
   * MOCK: solo devuelve el DTO con `activo: true` por default; no persiste.
   */
  async create(dto: CreateSensorDto) {
    return { ...dto, activo: dto.activo ?? true };
  }

  /**
   * Actualiza la configuración de un sensor existente.
   *
   * MOCK: no persiste; solo refleja el DTO recibido.
   */
  async update(sensorId: string, dto: UpdateSensorDto) {
    return { sensorId, ...dto };
  }

  /**
   * Desactiva un sensor del catálogo (soft-delete).
   *
   * MOCK: solo retorna un mensaje; no persiste.
   */
  async remove(sensorId: string) {
    return { mensaje: `Sensor ${sensorId} desactivado` };
  }

  async listarHistorico(query: QueryHistoricoDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const { items, total } = await this.repo.findHistorico({
      tipo: query.tipo,
      sensorId: query.sensorId,
      desde: query.desde,
      hasta: query.hasta,
      page,
      limit,
    });
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
      await this.repo.insertReading(lectura);
    } catch {
      // No queremos romper el flujo realtime si Mongo está caído.
    }
  }
}
