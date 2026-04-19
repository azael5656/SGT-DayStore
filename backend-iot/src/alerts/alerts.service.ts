import { Injectable } from '@nestjs/common';

/**
 * Servicio de alertas.
 * Gestiona las alertas generadas automaticamente por los sensores.
 *
 * TODO: inyectar @InjectModel(Alert.name). Implementar generarAlerta()
 * que sera llamado desde el handler de MQTT cuando una lectura cruce
 * un umbral definido en StoreConfig.
 */
@Injectable()
export class AlertsService {
  async findAll() {
    return [
      {
        id: 'mock-alert-1',
        tipo: 'puerta',
        severidad: 'media',
        mensaje: 'Puerta principal abierta fuera de horario',
        reconocida: false,
        fecha: new Date().toISOString(),
      },
    ];
  }

  async getStats() {
    return {
      totalHoy: 3,
      sinReconocer: 2,
      porSeveridad: { baja: 1, media: 1, alta: 1, critica: 0 },
    };
  }

  async findOne(id: string) {
    return {
      id,
      tipo: 'puerta',
      severidad: 'media',
      mensaje: 'Puerta principal abierta fuera de horario',
      reconocida: false,
      fecha: new Date().toISOString(),
    };
  }

  async acknowledge(id: string, userId: string) {
    // TODO: actualizar reconocida=true, reconocidaPor=userId, reconocidaEn=now
    return {
      id,
      reconocida: true,
      reconocidaPor: userId,
      reconocidaEn: new Date().toISOString(),
    };
  }
}
