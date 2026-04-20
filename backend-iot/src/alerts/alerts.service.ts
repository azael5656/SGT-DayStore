import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditPublisherService } from '../shared/audit-publisher.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Servicio de alertas.
 *
 * Las alertas viven en InMemoryStoreService (demo); las genera el
 * SimulatorService al ejecutar escenarios o el handler MQTT al cruzar
 * umbrales.
 *
 * TODO: cuando se implemente @InjectModel(Alert.name), preferir Mongo.
 */
@Injectable()
export class AlertsService {
  constructor(
    private readonly store: InMemoryStoreService,
    private readonly auditPublisher: AuditPublisherService,
  ) {}

  async findAll() {
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

  async acknowledge(
    id: string,
    user: { sub: string; email?: string; role?: string },
  ) {
    const alerta = this.store.acknowledgeAlert(id, user.sub);
    if (!alerta) throw new NotFoundException('Alerta no encontrada');
    void this.auditPublisher.publish({
      userId: user.sub,
      userEmail: user.email ?? null,
      userRole: user.role ?? null,
      action: 'alert.ack',
      resource: 'alerts',
      resourceId: id,
      metadata: { tipo: alerta.tipo, severidad: alerta.severidad },
    });
    return alerta;
  }
}
