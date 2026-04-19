import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Lógica de escenarios de demo.
 *
 * Cada escenario dramático (incendio, forzado) sostiene valores extremos
 * durante ~15 segundos publicando cada 2s, y marca en el store
 * `emergencyUntil` para que MockPublisherService no sobrescriba con
 * lecturas normales mientras dura la emergencia.
 *
 * El escenario `normal` resetea la emergencia, limpia alertas y publica
 * valores saludables.
 */

export type Escenario = 'incendio' | 'forzado' | 'normal';

const DURACION_EMERGENCIA_MS = 15_000;
const INTERVALO_BURST_MS = 2_000;

@Injectable()
export class SimulatorService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private burstTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly store: InMemoryStoreService,
    private readonly mqtt: MqttService,
  ) {}

  onModuleDestroy(): void {
    if (this.burstTimer) clearInterval(this.burstTimer);
  }

  ejecutar(escenario: Escenario) {
    switch (escenario) {
      case 'incendio':
        return this.incendio();
      case 'forzado':
        return this.forzado();
      case 'normal':
        return this.normal();
    }
  }

  private incendio() {
    this.limpiarBurst();
    const hasta = Date.now() + DURACION_EMERGENCIA_MS;
    this.store.setEmergencyUntil(hasta);

    const tempInicial = 38 + Math.random() * 4;
    this.publicarEmergenciaIncendio(tempInicial);

    const alerta = this.store.pushAlert({
      tipo: 'incendio',
      severidad: 'critica',
      mensaje: `Temperatura critica ${Math.round(tempInicial)}°C — posible incendio`,
    });

    this.burstTimer = setInterval(() => {
      if (Date.now() >= hasta) {
        this.limpiarBurst();
        return;
      }
      const temp = 38 + Math.random() * 4;
      this.publicarEmergenciaIncendio(temp);
    }, INTERVALO_BURST_MS);

    this.logger.warn(
      `🔥 Escenario INCENDIO lanzado — sostenido ${DURACION_EMERGENCIA_MS / 1000}s (${alerta.id})`,
    );
    return {
      escenario: 'incendio',
      alertaId: alerta.id,
      temperatura: Math.round(tempInicial * 10) / 10,
      duracionSegundos: DURACION_EMERGENCIA_MS / 1000,
    };
  }

  private forzado() {
    this.limpiarBurst();
    const hasta = Date.now() + DURACION_EMERGENCIA_MS;
    this.store.setEmergencyUntil(hasta);

    this.publicarEmergenciaForzado();
    const alerta = this.store.pushAlert({
      tipo: 'forzado',
      severidad: 'critica',
      mensaje: 'Intento de forzado detectado — puerta abierta fuera de horario con movimiento',
    });

    this.burstTimer = setInterval(() => {
      if (Date.now() >= hasta) {
        this.limpiarBurst();
        return;
      }
      this.publicarEmergenciaForzado();
    }, INTERVALO_BURST_MS);

    this.logger.warn(
      `🚨 Escenario FORZADO lanzado — sostenido ${DURACION_EMERGENCIA_MS / 1000}s (${alerta.id})`,
    );
    return {
      escenario: 'forzado',
      alertaId: alerta.id,
      duracionSegundos: DURACION_EMERGENCIA_MS / 1000,
    };
  }

  private normal() {
    this.limpiarBurst();
    this.store.clearEmergency();

    this.publicarLectura({
      sensorId: 'esp32-temperatura-bodega',
      tipo: 'temperatura',
      valor: 22,
      unidad: '°C',
      fecha: new Date().toISOString(),
    });
    this.publicarLectura({
      sensorId: 'esp32-puerta-principal',
      tipo: 'puerta',
      valor: 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
    this.publicarLectura({
      sensorId: 'mq2-humo',
      tipo: 'gas',
      valor: 0,
      unidad: 'alarma',
      fecha: new Date().toISOString(),
    });
    this.publicarLectura({
      sensorId: 'buzzer-principal',
      tipo: 'buzzer',
      valor: 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });

    this.store.clearAlerts();
    this.logger.log('✅ Escenario NORMAL aplicado (alertas limpiadas, emergencia desactivada)');
    return { escenario: 'normal', mensaje: 'Estado estable, alertas limpiadas' };
  }

  private limpiarBurst(): void {
    if (this.burstTimer) {
      clearInterval(this.burstTimer);
      this.burstTimer = null;
    }
  }

  private publicarEmergenciaIncendio(temperatura: number): void {
    const ts = new Date().toISOString();
    this.publicarLectura({
      sensorId: 'esp32-temperatura-bodega',
      tipo: 'temperatura',
      valor: Math.round(temperatura * 10) / 10,
      unidad: '°C',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'mq2-humo',
      tipo: 'gas',
      valor: 1,
      unidad: 'alarma',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'buzzer-principal',
      tipo: 'buzzer',
      valor: 1,
      unidad: 'estado',
      fecha: ts,
    });
  }

  private publicarEmergenciaForzado(): void {
    const ts = new Date().toISOString();
    this.publicarLectura({
      sensorId: 'esp32-puerta-principal',
      tipo: 'puerta',
      valor: 1,
      unidad: 'estado',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'pir-entrada',
      tipo: 'movimiento',
      valor: 1,
      unidad: 'evento',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'buzzer-principal',
      tipo: 'buzzer',
      valor: 1,
      unidad: 'estado',
      fecha: ts,
    });
  }

  private publicarLectura(lectura: {
    sensorId: string;
    tipo: string;
    valor: number;
    unidad: string;
    fecha: string;
  }): void {
    this.store.setReading(lectura);
    try {
      this.mqtt.publish(`tienda/${lectura.tipo}`, JSON.stringify(lectura));
    } catch {
      /* silent: MQTT puede no estar disponible en demo local */
    }
  }
}
