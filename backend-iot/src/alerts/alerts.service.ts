import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AuditPublisherService } from '../shared/audit-publisher.service';
import {
  InMemoryStoreService,
  StoredAlert,
} from '../shared/in-memory-store.service';
import { SimulatorService } from '../simulator/simulator.service';
import { AlertsRepository } from './alerts.repository';

/**
 * Las alertas viven en InMemoryStoreService (estado en vivo) y se PERSISTEN en
 * Mongo (write-through) para que sobrevivan reinicios del backend:
 *  - al arrancar, hidrata las no reconocidas desde Mongo al store;
 *  - en cada 'alert'/'alert.ack' del store, hace upsert en Mongo;
 *  - al limpiar alertas, las marca reconocidas para que no resuciten.
 */
@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly store: InMemoryStoreService,
    private readonly auditPublisher: AuditPublisherService,
    private readonly simulator: SimulatorService,
    private readonly repo: AlertsRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    // Hidratar alertas no reconocidas desde Mongo (resisten reinicios).
    try {
      const pendientes = await this.repo.findNoReconocidas();
      if (pendientes.length) {
        this.store.seedAlerts(pendientes);
        this.logger.log(
          `Hidratadas ${pendientes.length} alertas no reconocidas desde Mongo`,
        );
      }
    } catch (e) {
      this.logger.warn(`No se pudieron hidratar alertas: ${String(e)}`);
    }

    // Write-through: persistir cada alerta nueva/refrescada y cada ack.
    const persistir = (a: StoredAlert) => {
      void this.repo.upsert(a).catch((e) => {
        this.logger.warn(`No se pudo persistir alerta ${a.id}: ${String(e)}`);
      });
    };
    this.store.events.on('alert', persistir);
    this.store.events.on('alert.ack', persistir);
    this.store.events.on('alerts.cleared', () => {
      void this.repo.marcarTodasReconocidas().catch(() => undefined);
    });
  }

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
