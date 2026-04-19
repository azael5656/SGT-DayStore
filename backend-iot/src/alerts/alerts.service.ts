import { Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Servicio de alertas.
 *
 * Estado actual: mientras la persistencia en Mongo sigue como TODO (ver
 * alert.schema.ts del PR #2), las alertas viven en el InMemoryStoreService.
 * Las genera el módulo Simulator (endpoints de escenario para demo) o las
 * generaría el handler real de MQTT cuando detecte umbrales cruzados.
 *
 * Si el store está vacío respondemos con una alerta mock para que el móvil
 * no se rompa en la primera corrida.
 *
 * TODO: cuando se implemente @InjectModel(Alert.name), preferir Mongo.
 */
@Injectable()
export class AlertsService {
  constructor(private readonly store: InMemoryStoreService) {}

  async findAll() {
    if (!this.store.hasAlerts()) return [this.mockAlert()];
    return this.store.getAlerts();
  }

  async getStats() {
    const porSeveridad = this.store.contarPorSeveridad();
    const alertas = this.store.getAlerts();
    const hoy = new Date().toISOString().slice(0, 10);
    return {
      totalHoy: alertas.filter((a) => a.fecha.startsWith(hoy)).length,
      sinReconocer: alertas.filter((a) => !a.reconocida).length,
      porSeveridad,
    };
  }

  async findOne(id: string) {
    const alerta = this.store.getAlert(id);
    if (!alerta) throw new NotFoundException('Alerta no encontrada');
    return alerta;
  }

  async acknowledge(id: string, userId: string) {
    const alerta = this.store.acknowledgeAlert(id, userId);
    if (!alerta) throw new NotFoundException('Alerta no encontrada');
    return alerta;
  }

  private mockAlert() {
    return {
      id: 'mock-alert-1',
      tipo: 'puerta',
      severidad: 'media' as const,
      mensaje: 'Puerta principal abierta fuera de horario',
      reconocida: false,
      fecha: new Date().toISOString(),
    };
  }
}
