import { Injectable } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';

/**
 * Servicio de configuracion de sensores.
 * CRUD del catalogo de sensores registrados en la tienda.
 *
 * TODO: inyectar @InjectModel(SensorConfig.name) y reemplazar mocks.
 */
@Injectable()
export class SensorsService {
  async findAll() {
    return [
      {
        sensorId: 'esp32-puerta-principal',
        nombre: 'Puerta principal',
        tipo: 'puerta',
        ubicacion: 'entrada',
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
}
