import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InMemoryStoreService } from '../shared/in-memory-store.service';
import { StoreConfigService } from '../store-config/store-config.service';

/**
 * Vigila la santa maria (puerta del local, sensor MC-38) y decide si su
 * estado amerita una alerta de seguridad.
 *
 * Punto unico de decision: se suscribe al evento 'reading' del store, asi
 * cubre TODAS las fuentes de lecturas de puerta sin duplicar logica:
 *  - hardware real  -> MqttService rutea tienda/seguridad/puerta
 *  - simulador      -> escenarios santamaria_abierta / santamaria_cerrada
 *  - mock           -> estado inicial al arranque
 *
 * Reglas:
 *  - Puerta ABIERTA fuera de horario  -> alerta 'puerta_fuera_horario' (alta,
 *    visual sin buzzer). En horario es normal (no alerta).
 *  - Puerta CERRADA                   -> auto-resuelve la alerta si la habia
 *    ("cierre de puertas": el riesgo termino).
 *  - Durante una emergencia activa (escenario 'forzado') se omite: esa alerta
 *    critica ya cubre la puerta y no queremos duplicarla. Mismo criterio que
 *    usan MockPublisher y el burst de temperatura/humedad.
 */
@Injectable()
export class SantaMariaService implements OnModuleInit {
  private readonly logger = new Logger(SantaMariaService.name);

  static readonly TIPO_ALERTA = 'puerta_fuera_horario';

  constructor(
    private readonly store: InMemoryStoreService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  onModuleInit(): void {
    this.store.events.on('reading', (r: { tipo: string; valor: number }) => {
      if (r.tipo !== 'puerta') return;
      void this.evaluar(r.valor === 1);
    });
  }

  private async evaluar(abierta: boolean): Promise<void> {
    if (!abierta) {
      // Cierre de puertas: cualquier alerta de puerta fuera de horario se
      // resuelve sola. No-op si no habia ninguna activa.
      this.store.resolveAlertsByTipo(SantaMariaService.TIPO_ALERTA);
      return;
    }

    // Puerta abierta. Si hay un escenario critico en curso, lo dejamos pasar:
    // 'forzado' ya levanto su propia alerta.
    if (this.store.isEmergencyActive()) return;

    const abiertaLaTienda = await this.storeConfig.isOpenNow();
    if (abiertaLaTienda) return; // abierta en horario comercial = normal

    this.store.pushAlert({
      tipo: SantaMariaService.TIPO_ALERTA,
      severidad: 'alta',
      mensaje: 'Santa maria abierta fuera de horario',
    });
    this.logger.warn('Santa maria abierta con la tienda cerrada');
  }
}
