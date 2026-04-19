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
 * suscribe MqttService: tienda/temperatura, tienda/humedad, tienda/puerta,
 * tienda/movimiento, tienda/gas, tienda/buzzer. Cuando el handler real de
 * MQTT este implementado, las lecturas sinteticas fluiran por el mismo
 * camino que las reales (persistencia, alertas, etc.).
 *
 * Patron de simulacion:
 *  - Temperatura: random walk hacia un objetivo que varia por hora del dia.
 *  - Humedad: random walk entre 40-70%.
 *  - Puerta: casi siempre cerrada, aperturas esporadicas.
 *  - Movimiento: eventos discretos con baja probabilidad.
 *  - Gas: casi siempre 0 (limpio), pico raro.
 *  - Buzzer: 0 (silencio) en estado normal; los escenarios lo activan.
 *
 * MockPublisher respeta el flag `isEmergencyActive()` del store: mientras
 * dura un escenario (ej. incendio o forzado), NO sobrescribe las lecturas
 * dramaticas que SimulatorService esta publicando a mayor frecuencia.
 */
@Injectable()
export class MockPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MockPublisherService.name);
  private timers: ReturnType<typeof setInterval>[] = [];
  private temperaturaActual = 22;
  private humedadActual = 55;
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

    // Intervalos cortos para feedback real-time en la demo.
    this.timers.push(setInterval(() => this.publicarTemperatura(), 2000));
    this.timers.push(setInterval(() => this.publicarHumedad(), 3000));
    this.timers.push(setInterval(() => this.publicarPuerta(), 3000));
    this.timers.push(setInterval(() => this.publicarMovimiento(), 4000));
    this.timers.push(setInterval(() => this.publicarGas(), 5000));
    this.timers.push(setInterval(() => this.publicarBuzzer(), 3000));
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  /** Random walk hacia objetivo segun hora. Picos del 2% simulan aperturas. */
  private publicarTemperatura(): void {
    if (this.store.isEmergencyActive()) return;
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

  /** Humedad relativa: random walk entre 40 y 70%. */
  private publicarHumedad(): void {
    if (this.store.isEmergencyActive()) return;
    const drift = (55 - this.humedadActual) * 0.1;
    const ruido = (Math.random() - 0.5) * 2;
    const nueva = this.clamp(this.humedadActual + drift + ruido, 40, 70);
    this.humedadActual = Math.round(nueva);

    this.publish('tienda/humedad', {
      sensorId: 'dht22-ambiente',
      tipo: 'humedad',
      valor: this.humedadActual,
      unidad: '%',
      fecha: new Date().toISOString(),
    });
  }

  /** Puerta: 3% abre, 40% cierra. Solo publica cuando hay cambio. */
  private publicarPuerta(): void {
    if (this.store.isEmergencyActive()) return;
    if (!this.puertaAbierta && Math.random() < 0.03) {
      this.puertaAbierta = true;
    } else if (this.puertaAbierta && Math.random() < 0.4) {
      this.puertaAbierta = false;
    } else {
      return;
    }

    this.publish('tienda/puerta', {
      sensorId: 'esp32-puerta-principal',
      tipo: 'puerta',
      valor: this.puertaAbierta ? 1 : 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
  }

  /** Movimiento: evento discreto con 5% de probabilidad. */
  private publicarMovimiento(): void {
    if (this.store.isEmergencyActive()) return;
    if (Math.random() >= 0.05) return;
    this.publish('tienda/movimiento', {
      sensorId: 'pir-entrada',
      tipo: 'movimiento',
      valor: 1,
      unidad: 'evento',
      fecha: new Date().toISOString(),
    });
  }

  /** Gas (humo/CO): normalmente 0. Pico raro para simular detector sensible. */
  private publicarGas(): void {
    if (this.store.isEmergencyActive()) return;
    // 99% del tiempo en 0.
    const valor = Math.random() < 0.99 ? 0 : 1;
    this.publish('tienda/gas', {
      sensorId: 'mq2-humo',
      tipo: 'gas',
      valor,
      unidad: 'alarma',
      fecha: new Date().toISOString(),
    });
  }

  /** Buzzer: silencio (0) en operacion normal. Los escenarios lo encienden. */
  private publicarBuzzer(): void {
    if (this.store.isEmergencyActive()) return;
    this.publish('tienda/buzzer', {
      sensorId: 'buzzer-principal',
      tipo: 'buzzer',
      valor: 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
  }

  private publish(topic: string, payload: Record<string, unknown>): void {
    // 1) Escribir al store en memoria (y emitir por websocket via helper del store).
    this.store.setReading({
      sensorId: String(payload.sensorId),
      tipo: String(payload.tipo),
      valor: Number(payload.valor),
      unidad: String(payload.unidad),
      fecha: String(payload.fecha),
    });
    // 2) Publicar por MQTT tambien.
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
