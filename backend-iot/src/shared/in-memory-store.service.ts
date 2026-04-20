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

  /**
   * Emisor de eventos para real-time. Los consumidores (EventsGateway)
   * se suscriben en onModuleInit y retransmiten a clientes por Socket.IO.
   *
   * Eventos:
   *  - 'reading' (StoredReading)
   *  - 'alert'   (StoredAlert) — alerta nueva
   *  - 'alert.ack' (StoredAlert) — alerta reconocida
   *  - 'alerts.cleared' (void)
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

  // ---------- Lecturas ----------

  setReading(reading: StoredReading): void {
    this.readings.set(reading.sensorId, reading);
    this.events.emit('reading', reading);
  }

  getReadings(): StoredReading[] {
    return Array.from(this.readings.values()).sort((a, b) =>
      b.fecha.localeCompare(a.fecha),
    );
  }

  getReading(sensorId: string): StoredReading | undefined {
    return this.readings.get(sensorId);
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
