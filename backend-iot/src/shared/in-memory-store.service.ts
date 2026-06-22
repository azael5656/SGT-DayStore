import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

/**
 * Cache en memoria para el modo demo / dev.
 *
 * Propósito: permitir que el flujo simulador → dashboard del móvil funcione
 * *sin* depender de la persistencia en Mongo (que todavía está como TODO en
 * sensor-reading.schema.ts y alert.schema.ts del PR #2).
 *
 * Cuando el equipo implemente la persistencia real, TelemetryService y
 * AlertsService pueden preferir Mongo y usar este store solo como fallback,
 * o retirarlo por completo.
 *
 * Es singleton global (ver SharedModule) y los datos se pierden al reiniciar
 * el proceso. NO usar en producción.
 */

export interface StoredReading {
  sensorId: string;
  tipo: 'temperatura' | 'puerta' | 'movimiento' | 'humedad' | string;
  valor: number;
  unidad: string;
  fecha: string;
}

export type Severidad = 'baja' | 'media' | 'alta' | 'critica';

/**
 * Sensor que el watchdog considera sin señal. `tipos` son las lecturas que ese
 * sensor produce (p.ej. el DHT22 => temperatura + humedad), para que la UI sepa
 * qué tarjetas marcar como "Desconectado" sin parsear el texto de la alerta.
 */
export interface SensorDesconectado {
  sensorId: string;
  nombre: string;
  tipos: string[];
}

export interface StoredAlert {
  id: string;
  tipo: string;
  severidad: Severidad;
  mensaje: string;
  reconocida: boolean;
  fecha: string;
  reconocidaPor?: string;
  reconocidaEn?: string;
}

@Injectable()
export class InMemoryStoreService {
  private readonly logger = new Logger(InMemoryStoreService.name);
  private readonly readings = new Map<string, StoredReading>();
  private readonly alerts: StoredAlert[] = [];
  private emergencyUntil = 0;
  // Estado del ESP32 segun su heartbeat/LWT (tienda/sistema/status):
  //   null  = aun no sabemos (no llego ningun heartbeat tras el arranque)
  //   true  = online   false = offline (LWT o "offline" explicito)
  private deviceOnline: boolean | null = null;
  // Sensores sin señal segun SensorWatchdogService (para que la UI marque sus
  // tarjetas como "Desconectado"). Lista vacia = todos reportando.
  private sensoresDesconectados: SensorDesconectado[] = [];

  /**
   * Emisor de eventos para real-time. Los consumidores (EventsGateway)
   * se suscriben en onModuleInit y retransmiten a clientes por Socket.IO.
   *
   * Eventos:
   *  - 'reading' (StoredReading)
   *  - 'alert'   (StoredAlert) — alerta nueva
   *  - 'alert.ack' (StoredAlert) — alerta reconocida
   *  - 'alerts.cleared' (void)
   *  - 'device.status' (boolean) — heartbeat/LWT del ESP32 (true=online)
   *  - 'sensors.status' (SensorDesconectado[]) — sensores sin señal (watchdog)
   */
  readonly events = new EventEmitter();

  // ---------- Modo emergencia (bloquea MockPublisher mientras dura un escenario) ----------

  setEmergencyUntil(timestampMs: number): void {
    this.emergencyUntil = timestampMs;
  }

  isEmergencyActive(): boolean {
    return Date.now() < this.emergencyUntil;
  }

  clearEmergency(): void {
    this.emergencyUntil = 0;
  }

  // ---------- Estado del dispositivo (heartbeat / LWT del ESP32) ----------

  /**
   * Registra el estado reportado por el ESP32 en tienda/sistema/status.
   * Lo alimenta MqttService (heartbeat "online" cada 15s, o "offline" del
   * Last Will & Testament del broker cuando el equipo se cae sin avisar).
   * Emite 'device.status' para que SensorWatchdogService reaccione al instante.
   */
  setDeviceStatus(online: boolean): void {
    this.deviceOnline = online;
    this.events.emit('device.status', online);
  }

  /** true=online, false=offline, null=aun sin heartbeat tras el arranque. */
  getDeviceStatus(): boolean | null {
    return this.deviceOnline;
  }

  /**
   * Publica la lista de sensores sin señal (la calcula SensorWatchdogService).
   * Emite 'sensors.status' para que la UI marque/limpie las tarjetas en vivo.
   */
  setSensoresDesconectados(lista: SensorDesconectado[]): void {
    this.sensoresDesconectados = lista;
    this.events.emit('sensors.status', lista);
  }

  getSensoresDesconectados(): SensorDesconectado[] {
    return [...this.sensoresDesconectados];
  }

  // ---------- Lecturas ----------

  /**
   * El key compuesto "sensorId::tipo" evita colisiones cuando un mismo
   * sensor fisico emite multiples lecturas (p.ej. DHT22 emite temperatura
   * Y humedad con el mismo sensorId). Antes la humedad sobrescribia a la
   * temperatura y viceversa.
   */
  private keyOf(r: { sensorId: string; tipo: string }): string {
    return `${r.sensorId}::${r.tipo}`;
  }

  setReading(reading: StoredReading): void {
    this.readings.set(this.keyOf(reading), reading);
    this.events.emit('reading', reading);
  }

  getReadings(): StoredReading[] {
    return Array.from(this.readings.values()).sort((a, b) =>
      b.fecha.localeCompare(a.fecha),
    );
  }

  getReading(sensorId: string): StoredReading | undefined {
    for (const r of this.readings.values()) {
      if (r.sensorId === sensorId) return r;
    }
    return undefined;
  }

  getLatestByTipo(tipo: string): StoredReading | undefined {
    let ultima: StoredReading | undefined;
    for (const r of this.readings.values()) {
      if (r.tipo !== tipo) continue;
      if (!ultima || r.fecha > ultima.fecha) ultima = r;
    }
    return ultima;
  }

  isEmpty(): boolean {
    return this.readings.size === 0;
  }

  // ---------- Alertas ----------

  pushAlert(alert: Omit<StoredAlert, 'id' | 'fecha' | 'reconocida'> & {
    id?: string;
    fecha?: string;
    reconocida?: boolean;
  }): StoredAlert {
    // Dedupe: si ya hay una alerta NO reconocida del mismo tipo, la reusamos
    // refrescando la fecha y el mensaje. Esto evita que lanzar varias veces
    // el mismo escenario (incendio, forzado, corte_luz) apile alertas
    // iguales. Cuando la actual sea reconocida, el proximo push crea una nueva.
    const existente = this.alerts.find(
      (a) => a.tipo === alert.tipo && !a.reconocida,
    );
    if (existente) {
      existente.mensaje = alert.mensaje;
      existente.severidad = alert.severidad;
      existente.fecha = alert.fecha ?? new Date().toISOString();
      this.events.emit('alert', existente);
      return existente;
    }

    const completa: StoredAlert = {
      id: alert.id ?? randomUUID(),
      tipo: alert.tipo,
      severidad: alert.severidad,
      mensaje: alert.mensaje,
      reconocida: alert.reconocida ?? false,
      fecha: alert.fecha ?? new Date().toISOString(),
    };
    this.alerts.unshift(completa);
    this.events.emit('alert', completa);
    this.logger.log(
      `Alerta ${completa.severidad}/${completa.tipo}: ${completa.mensaje}`,
    );
    return completa;
  }

  getAlerts(): StoredAlert[] {
    return [...this.alerts];
  }

  /**
   * Inserta alertas al arrancar (hidratación desde Mongo tras un reinicio) sin
   * re-emitir eventos: solo repuebla el estado en memoria para que la API y el
   * dashboard las vean. No dispara buzzer ni sockets (no hay clientes aún).
   */
  seedAlerts(alerts: StoredAlert[]): void {
    for (const a of alerts) {
      if (!this.alerts.some((x) => x.id === a.id)) this.alerts.push(a);
    }
  }

  getAlert(id: string): StoredAlert | undefined {
    return this.alerts.find((a) => a.id === id);
  }

  acknowledgeAlert(id: string, userId: string): StoredAlert | undefined {
    const a = this.alerts.find((x) => x.id === id);
    if (!a) return undefined;
    a.reconocida = true;
    a.reconocidaPor = userId;
    a.reconocidaEn = new Date().toISOString();
    this.events.emit('alert.ack', a);
    return a;
  }

  /**
   * Resuelve (auto-reconoce) todas las alertas NO reconocidas de un tipo.
   * Lo usa SantaMariaService al cerrarse la puerta: el riesgo termino, asi
   * que la alerta "puerta_fuera_horario" se cierra sola sin intervencion
   * manual. Emite 'alert.ack' por cada una para que la UI la actualice por
   * el mismo canal que el ack manual.
   */
  resolveAlertsByTipo(tipo: string, userId = 'sistema'): StoredAlert[] {
    const resueltas: StoredAlert[] = [];
    for (const a of this.alerts) {
      if (a.tipo !== tipo || a.reconocida) continue;
      a.reconocida = true;
      a.reconocidaPor = userId;
      a.reconocidaEn = new Date().toISOString();
      this.events.emit('alert.ack', a);
      resueltas.push(a);
    }
    return resueltas;
  }

  clearAlerts(): void {
    this.alerts.length = 0;
    this.events.emit('alerts.cleared');
  }

  hasAlerts(): boolean {
    return this.alerts.length > 0;
  }

  contarPorSeveridad(): Record<Severidad, number> {
    const conteo: Record<Severidad, number> = {
      baja: 0,
      media: 0,
      alta: 0,
      critica: 0,
    };
    for (const a of this.alerts) conteo[a.severidad]++;
    return conteo;
  }
}
