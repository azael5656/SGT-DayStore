import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MqttService } from '../mqtt/mqtt.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Publicador simulado de lecturas de sensores.
 *
 * Se activa unicamente cuando la variable de entorno MOCK_SENSORS=true,
 * asi que en produccion (con ESP32 real) este servicio queda inerte.
 *
 * Sustituye al ESP32 publicando a los mismos topicos MQTT a los que se
 * suscribe MqttService: tienda/temperatura, tienda/puerta, tienda/movimiento.
 * Cuando el handler real de MQTT este implementado, las lecturas sinteticas
 * fluiran por el mismo camino que las reales (persistencia, alertas, etc.).
 *
 * Patron de simulacion:
 *  - Temperatura: random walk hacia un objetivo que varia por hora del dia
 *    (26 C en horario comercial 10:00-18:00, 22 C en horas valle). Ocasional
 *    pico de +3 C simula apertura de nevera o cambio de carga termica.
 *  - Puerta: casi siempre cerrada. Se "abre" con baja probabilidad y se
 *    cierra unos segundos despues.
 *  - Movimiento: eventos discretos con baja probabilidad.
 */
@Injectable()
export class MockPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MockPublisherService.name);
  private timers: ReturnType<typeof setInterval>[] = [];
  private temperaturaActual = 22;
  private puertaAbierta = false;

  constructor(
    private readonly config: ConfigService,
    private readonly mqtt: MqttService,
    private readonly store: InMemoryStoreService,
  ) {}

  onModuleInit(): void {
    const habilitado = this.config.get<string>('MOCK_SENSORS') === 'true';
    if (!habilitado) {
      return;
    }

    this.logger.log(
      'Simulador de sensores ACTIVO (MOCK_SENSORS=true). Publicando a tienda/#',
    );

    this.timers.push(setInterval(() => this.publicarTemperatura(), 5000));
    this.timers.push(setInterval(() => this.publicarPuerta(), 4000));
    this.timers.push(setInterval(() => this.publicarMovimiento(), 7000));
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  /**
   * Random walk hacia objetivo segun hora. Picos del 2% simulan aperturas.
   */
  private publicarTemperatura(): void {
    const hora = new Date().getHours();
    const objetivo = hora >= 10 && hora <= 18 ? 26 : 22;
    const drift = (objetivo - this.temperaturaActual) * 0.15;
    const ruido = (Math.random() - 0.5) * 0.4;
    const pico = Math.random() < 0.02 ? 3 : 0;
    const nueva = this.clamp(this.temperaturaActual + drift + ruido + pico, 15, 35);
    this.temperaturaActual = Math.round(nueva * 10) / 10;

    this.publish('tienda/temperatura', {
      sensorId: 'esp32-temperatura-bodega',
      tipo: 'temperatura',
      valor: this.temperaturaActual,
      unidad: '°C',
      fecha: new Date().toISOString(),
    });
  }

  /**
   * 3% de probabilidad de abrir la puerta si esta cerrada. Si esta abierta,
   * 40% de probabilidad de cerrarla en cada tick (estancias cortas).
   */
  private publicarPuerta(): void {
    if (!this.puertaAbierta && Math.random() < 0.03) {
      this.puertaAbierta = true;
    } else if (this.puertaAbierta && Math.random() < 0.4) {
      this.puertaAbierta = false;
    } else {
      return; // Sin cambio, no publicamos.
    }

    this.publish('tienda/puerta', {
      sensorId: 'esp32-puerta-principal',
      tipo: 'puerta',
      valor: this.puertaAbierta ? 1 : 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
  }

  /**
   * Evento discreto con 5% de probabilidad por tick.
   */
  private publicarMovimiento(): void {
    if (Math.random() >= 0.05) return;
    this.publish('tienda/movimiento', {
      sensorId: 'esp32-movimiento-entrada',
      tipo: 'movimiento',
      valor: 1,
      unidad: 'evento',
      fecha: new Date().toISOString(),
    });
  }

  private publish(topic: string, payload: Record<string, unknown>): void {
    // 1) Escribir al store en memoria para que Telemetry/Alerts services
    //    puedan responder en vivo sin depender del handler MQTT→Mongo
    //    (que todavía es TODO en mqtt.service.ts).
    this.store.setReading({
      sensorId: String(payload.sensorId),
      tipo: String(payload.tipo),
      valor: Number(payload.valor),
      unidad: String(payload.unidad),
      fecha: String(payload.fecha),
    });

    // 2) Publicar también por MQTT (así cuando el handler de persistencia
    //    esté implementado, las lecturas se guardan en Mongo sin tocar
    //    nada aquí).
    try {
      this.mqtt.publish(topic, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`No se pudo publicar en ${topic}: ${String(err)}`);
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
