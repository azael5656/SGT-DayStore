import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';
import { AuditPublisherService } from '../shared/audit-publisher.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Logica de escenarios de demo, alineada al hardware REAL que existe hoy:
 *  - DHT22 (temperatura + humedad)
 *  - MC-38 (santa maria / puerta)
 *  - Buzzer 5V
 * No simulamos sensores que aun no se tienen: si se suma uno nuevo, su propia
 * telemetria lo hara aparecer en el panel (registro dinamico del watchdog).
 *
 * Los escenarios dramaticos marcan `emergencyUntil` en el store para que
 * MockPublisher no sobrescriba con lecturas normales mientras dura la emergencia.
 *
 * Escenarios:
 *  - incendio: temperatura alta (>=38°C) + humedad baja + buzzer ON
 *  - forzado: santa maria abierta a la fuerza + alerta critica + buzzer ON
 *  - corte_luz: alerta critica (no hay medidor de corriente fisico) + buzzer ON
 *  - santamaria_abierta: abre la santa maria (MC-38). Si la tienda esta
 *      cerrada, SantaMariaService levanta 'puerta_fuera_horario' (alta).
 *  - santamaria_cerrada: cierra la santa maria. SantaMariaService auto-resuelve
 *      la alerta de puerta si la habia.
 *  - desconexion: marca el ESP32 offline; el watchdog levanta sensor_desconectado.
 *  - normal: limpia alertas, apaga buzzer, valores saludables (DHT22 + santa maria)
 */

export type Escenario =
  | 'incendio'
  | 'forzado'
  | 'corte_luz'
  | 'santamaria_abierta'
  | 'santamaria_cerrada'
  | 'desconexion'
  | 'normal';

const DURACION_EMERGENCIA_MS = 15_000;
const INTERVALO_BURST_MS = 2_000;

@Injectable()
export class SimulatorService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private burstTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly store: InMemoryStoreService,
    private readonly mqtt: MqttService,
    private readonly auditPublisher: AuditPublisherService,
  ) {}

  onModuleDestroy(): void {
    if (this.burstTimer) clearInterval(this.burstTimer);
  }

  ejecutar(escenario: Escenario) {
    void this.auditPublisher.publish({
      action: 'iot.scenario.run',
      resource: 'simulator',
      resourceId: escenario,
      metadata: { escenario },
    });
    switch (escenario) {
      case 'incendio':
        return this.incendio();
      case 'forzado':
        return this.forzado();
      case 'corte_luz':
        return this.corteLuz();
      case 'santamaria_abierta':
        return this.santaMaria(true);
      case 'santamaria_cerrada':
        return this.santaMaria(false);
      case 'desconexion':
        return this.desconexion();
      case 'normal':
        return this.normal();
    }
  }

  /**
   * Simula que el ESP32 se cae (sin energia / sin red): marca el equipo
   * offline igual que haria el LWT del broker. SensorWatchdogService levanta
   * la alerta 'sensor_desconectado' al instante. Se recupera con el escenario
   * 'normal' (vuelve a 'online').
   */
  private desconexion() {
    this.limpiarBurst();
    this.store.setDeviceStatus(false);
    try {
      this.mqtt.publish('tienda/sistema/status', 'offline', { retain: true });
    } catch {
      /* silent: MQTT puede no estar disponible en demo local */
    }
    this.logger.warn('🔌 Escenario DESCONEXION: ESP32 marcado OFFLINE');
    return {
      escenario: 'desconexion',
      mensaje:
        'ESP32 offline; el watchdog levantara la alerta sensor_desconectado',
    };
  }

  /**
   * Abre o cierra la santa maria (MC-38) en un solo disparo, sin marcar
   * emergencia. La alerta "fuera de horario" la decide SantaMariaService al
   * recibir esta lectura, segun el horario real de la tienda.
   */
  private santaMaria(abierta: boolean) {
    this.limpiarBurst();
    this.publicarLectura({
      sensorId: 'mc38-santa-maria',
      tipo: 'puerta',
      valor: abierta ? 1 : 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
    this.logger.log(
      `🚪 Santa maria ${abierta ? 'ABIERTA' : 'CERRADA'} (escenario)`,
    );
    return {
      escenario: abierta ? 'santamaria_abierta' : 'santamaria_cerrada',
      puerta: abierta ? 'abierta' : 'cerrada',
    };
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
        // Fin del burst: dejamos de sostener valores extremos, pero NO apagamos
        // el buzzer aqui. La alarma vive mientras la alerta siga sin reconocer
        // (la apaga MqttService.syncBuzzer al reconocerla/resolverla).
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
      mensaje: 'Intento de forzado detectado — santa maria abierta a la fuerza',
    });

    this.burstTimer = setInterval(() => {
      if (Date.now() >= hasta) {
        // Fin del burst: dejamos de sostener valores extremos, pero NO apagamos
        // el buzzer aqui. La alarma vive mientras la alerta siga sin reconocer
        // (la apaga MqttService.syncBuzzer al reconocerla/resolverla).
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

  private corteLuz() {
    this.limpiarBurst();
    // Pausa el mock mientras "no hay luz" (sensores callados). No hay medidor de
    // corriente fisico, asi que el escenario es solo la alerta critica.
    this.store.setEmergencyUntil(Date.now() + DURACION_EMERGENCIA_MS);

    const alerta = this.store.pushAlert({
      tipo: 'corte_luz',
      severidad: 'critica',
      mensaje: 'Corte de energia detectado',
    });

    this.logger.warn(`⚡ Escenario CORTE DE LUZ lanzado (${alerta.id})`);
    return {
      escenario: 'corte_luz',
      alertaId: alerta.id,
      duracionSegundos: DURACION_EMERGENCIA_MS / 1000,
    };
  }

  private normal() {
    this.limpiarBurst();
    this.store.clearEmergency();
    // Reconecta el equipo: si venia de 'desconexion', el watchdog resuelve la
    // alerta de desconexion al ver el estado online de nuevo.
    this.store.setDeviceStatus(true);
    try {
      this.mqtt.publish('tienda/sistema/status', 'online', { retain: true });
    } catch {
      /* silent: MQTT puede no estar disponible en demo local */
    }

    const ts = new Date().toISOString();
    this.publicarLectura({
      sensorId: 'dht22-ambiente',
      tipo: 'temperatura',
      valor: 22,
      unidad: '°C',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'dht22-ambiente',
      tipo: 'humedad',
      valor: 55,
      unidad: '%',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'mc38-santa-maria',
      tipo: 'puerta',
      valor: 0,
      unidad: 'estado',
      fecha: ts,
    });
    // Solo publicamos el hardware que existe hoy (DHT22 + santa maria). Si se
    // suma un sensor nuevo, su propia telemetria lo hara aparecer en el panel.
    // El buzzer lo apaga MqttService.syncBuzzer al limpiarse las alertas.
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

  /**
   * Detiene un escenario activo (si lo hay): deja de sostener valores extremos.
   * Lo usa AlertsService al reconocer una alerta critica. El buzzer NO se toca
   * aqui: lo apaga MqttService.syncBuzzer en respuesta al 'alert.ack'.
   */
  public stopIfActive(): boolean {
    if (!this.burstTimer && !this.store.isEmergencyActive()) return false;
    this.limpiarBurst();
    this.store.clearEmergency();
    this.logger.log('⏹ Escenario detenido por ack de alerta critica');
    return true;
  }

  private publicarEmergenciaIncendio(temperatura: number): void {
    const ts = new Date().toISOString();
    this.publicarLectura({
      sensorId: 'dht22-ambiente',
      tipo: 'temperatura',
      valor: Math.round(temperatura * 10) / 10,
      unidad: '°C',
      fecha: ts,
    });
    // El calor reseca el ambiente: la humedad baja.
    this.publicarLectura({
      sensorId: 'dht22-ambiente',
      tipo: 'humedad',
      valor: 25 + Math.round(Math.random() * 5),
      unidad: '%',
      fecha: ts,
    });
  }

  private publicarEmergenciaForzado(): void {
    // Lo unico real de un forzado es la santa maria abierta a la fuerza.
    this.publicarLectura({
      sensorId: 'mc38-santa-maria',
      tipo: 'puerta',
      valor: 1,
      unidad: 'estado',
      fecha: new Date().toISOString(),
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
