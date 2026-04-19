import { Injectable } from '@nestjs/common';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';

/**
 * Servicio de configuracion de la tienda.
 * Guarda horarios y umbrales que usa el sistema de alertas para decidir
 * si una lectura de sensor es normal (dentro de horario) o sospechosa.
 *
 * TODO: inyectar @InjectModel(StoreConfig.name). Usar upsert porque
 * normalmente solo hay un documento de config por tienda.
 */
@Injectable()
export class StoreConfigService {
  async get() {
    return {
      horarioApertura: '08:00',
      horarioCierre: '20:00',
      zonaHoraria: 'America/Bogota',
      modoNocturno: false,
      umbralesAlerta: {
        temperaturaMax: 28,
        humedadMax: 80,
      },
    };
  }

  async update(dto: UpdateStoreConfigDto) {
    // TODO: upsert en Mongo.
    return {
      horarioApertura: dto.horarioApertura || '08:00',
      horarioCierre: dto.horarioCierre || '20:00',
      zonaHoraria: dto.zonaHoraria || 'America/Bogota',
      modoNocturno: dto.modoNocturno || false,
      umbralesAlerta: dto.umbralesAlerta || {},
    };
  }
}
