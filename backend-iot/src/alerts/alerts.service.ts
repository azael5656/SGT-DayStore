import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditPublisherService } from '../shared/audit-publisher.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';
import { SimulatorService } from '../simulator/simulator.service';

/**
 * Las alertas viven en InMemoryStoreService (demo). Las genera
 * SimulatorService al ejecutar escenarios o el handler MQTT al cruzar
 * umbrales.
 */
@Injectable()
export class AlertsService {
  constructor(
    private readonly store: InMemoryStoreService,
    private readonly auditPublisher: AuditPublisherService,
    private readonly simulator: SimulatorService,
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

    // Si era critica, detener el escenario y apagar el buzzer. Ya se entero.
    if (alerta.severidad === 'critica') {
      this.simulator.stopIfActive();
    }

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
