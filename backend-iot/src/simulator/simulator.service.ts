import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';
import { AuditPublisherService } from '../shared/audit-publisher.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Logica de escenarios de demo, alineada al hardware real de la tienda:
 *  - DHT22 (temperatura + humedad)
 *  - 5x MC-38 (puertas)
 *  - 3x SW-420 (vibracion en vitrinas)
 *  - PIR HC-SR501 (movimiento)
 *  - SCT-013-030 (corriente)
 *  - Buzzer 5V
 *
 * Cada escenario dramatico sostiene valores extremos ~15s publicando cada 2s
 * y marca `emergencyUntil` en el store para que MockPublisher no sobrescriba
 * con lecturas normales mientras dura la emergencia.
 *
 * Escenarios:
 *  - incendio: temperatura alta (>=38°C) + humedad baja + buzzer ON
 *  - forzado: puerta abierta + vibracion en vitrinas + movimiento + buzzer ON
 *  - corte_luz: corriente = 0 W + buzzer ON
 *  - santamaria_abierta: abre la santa maria (MC-38). Si la tienda esta
 *      cerrada, SantaMariaService levanta 'puerta_fuera_horario' (alta).
 *  - santamaria_cerrada: cierra la santa maria. SantaMariaService auto-resuelve
 *      la alerta de puerta si la habia.
 *  - normal: limpia alertas, apaga buzzer, valores saludables
 */

export type Escenario =
  | 'incendio'
  | 'forzado'
  | 'corte_luz'
  | 'santamaria_abierta'
  | 'santamaria_cerrada'
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
      case 'normal':
        return this.normal();
    }
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
      mensaje: 'Intento de forzado detectado — vibracion + puerta abierta + movimiento',
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
    const hasta = Date.now() + DURACION_EMERGENCIA_MS;
    this.store.setEmergencyUntil(hasta);

    this.publicarEmergenciaCorte();
    const alerta = this.store.pushAlert({
      tipo: 'corte_luz',
      severidad: 'critica',
      mensaje: 'Corte de energia detectado — consumo cayo a 0 W',
    });

    this.burstTimer = setInterval(() => {
      if (Date.now() >= hasta) {
        // Fin del burst: dejamos de sostener valores extremos, pero NO apagamos
        // el buzzer aqui. La alarma vive mientras la alerta siga sin reconocer
        // (la apaga MqttService.syncBuzzer al reconocerla/resolverla).
        this.limpiarBurst();
        return;
      }
      this.publicarEmergenciaCorte();
    }, INTERVALO_BURST_MS);

    this.logger.warn(
      `⚡ Escenario CORTE DE LUZ lanzado — sostenido ${DURACION_EMERGENCIA_MS / 1000}s (${alerta.id})`,
    );
    return {
      escenario: 'corte_luz',
      alertaId: alerta.id,
      duracionSegundos: DURACION_EMERGENCIA_MS / 1000,
    };
  }

  private normal() {
    this.limpiarBurst();
    this.store.clearEmergency();

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
    for (const id of ['sw420-vitrina-1', 'sw420-vitrina-2']) {
      this.publicarLectura({
        sensorId: id,
        tipo: 'vibracion',
        valor: 0,
        unidad: 'evento',
        fecha: ts,
      });
    }
    this.publicarLectura({
      sensorId: 'pir-hcsr501-interior',
      tipo: 'movimiento',
      valor: 0,
      unidad: 'evento',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'sct013-030-principal',
      tipo: 'corriente',
      valor: 280,
      unidad: 'W',
      fecha: ts,
    });
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
    const ts = new Date().toISOString();
    this.publicarLectura({
      sensorId: 'mc38-santa-maria',
      tipo: 'puerta',
      valor: 1,
      unidad: 'estado',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'sw420-vitrina-1',
      tipo: 'vibracion',
      valor: 1,
      unidad: 'evento',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'sw420-vitrina-2',
      tipo: 'vibracion',
      valor: 1,
      unidad: 'evento',
      fecha: ts,
    });
    this.publicarLectura({
      sensorId: 'pir-hcsr501-interior',
      tipo: 'movimiento',
      valor: 1,
      unidad: 'evento',
      fecha: ts,
    });
  }

  private publicarEmergenciaCorte(): void {
    const ts = new Date().toISOString();
    this.publicarLectura({
      sensorId: 'sct013-030-principal',
      tipo: 'corriente',
      valor: 0,
      unidad: 'W',
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
