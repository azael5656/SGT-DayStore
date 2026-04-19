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
 * Publicador simulado que imita el hardware real de la tienda:
 *  - DHT22 (temperatura + humedad)
 *  - MC-38 (5 sensores magneticos: entrada + 4 vitrinas)
 *  - SW-420 (3 sensores de vibracion en vitrinas de figuras)
 *  - PIR HC-SR501 (movimiento interior)
 *  - SCT-013-030 (corriente de la tienda)
 *  - Buzzer 5V (actuador)
 *
 * Se activa solo con MOCK_SENSORS=true para que en produccion el ESP32 real
 * sea la unica fuente. Cuando MqttService reciba del ESP32, los datos
 * fluiran por el mismo path (store + websocket).
 *
 * Respeta `store.isEmergencyActive()`: durante un escenario no sobrescribe
 * los valores dramaticos que publica SimulatorService.
 */
@Injectable()
export class MockPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MockPublisherService.name);
  private timers: ReturnType<typeof setInterval>[] = [];
  private temperaturaActual = 22;
  private humedadActual = 55;
  private corrienteActual = 280;
  private puertas: Record<string, boolean> = {
    'mc38-entrada': false,
    'mc38-vitrina-1': false,
    'mc38-vitrina-2': false,
    'mc38-vitrina-3': false,
    'mc38-vitrina-4': false,
  };

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

    this.timers.push(setInterval(() => this.publicarTemperatura(), 2000));
    this.timers.push(setInterval(() => this.publicarHumedad(), 3000));
    this.timers.push(setInterval(() => this.publicarPuertas(), 3000));
    this.timers.push(setInterval(() => this.publicarMovimiento(), 4000));
    this.timers.push(setInterval(() => this.publicarVibracion(), 4000));
    this.timers.push(setInterval(() => this.publicarCorriente(), 3000));
    this.timers.push(setInterval(() => this.publicarBuzzer(), 3000));
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

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
      sensorId: 'dht22-ambiente',
      tipo: 'temperatura',
      valor: this.temperaturaActual,
      unidad: '°C',
      fecha: new Date().toISOString(),
    });
  }

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

  /**
   * 5 MC-38: entrada + 4 vitrinas. Cada uno con su propia probabilidad.
   * Solo publica cuando hay cambio de estado (evento real del sensor).
   */
  private publicarPuertas(): void {
    if (this.store.isEmergencyActive()) return;
    const sensores = Object.keys(this.puertas);
    for (const id of sensores) {
      const abierta = this.puertas[id];
      let nuevoEstado = abierta;
      if (!abierta && Math.random() < 0.03) {
        nuevoEstado = true;
      } else if (abierta && Math.random() < 0.4) {
        nuevoEstado = false;
      }
      if (nuevoEstado === abierta) continue;
      this.puertas[id] = nuevoEstado;
      this.publish('tienda/puerta', {
        sensorId: id,
        tipo: 'puerta',
        valor: nuevoEstado ? 1 : 0,
        unidad: 'estado',
        fecha: new Date().toISOString(),
      });
    }
  }

  private publicarMovimiento(): void {
    if (this.store.isEmergencyActive()) return;
    if (Math.random() >= 0.05) return;
    this.publish('tienda/movimiento', {
      sensorId: 'pir-hcsr501-interior',
      tipo: 'movimiento',
      valor: 1,
      unidad: 'evento',
      fecha: new Date().toISOString(),
    });
  }

  /** SW-420 en 3 vitrinas de figuras costosas. 1% pico falso por ruido. */
  private publicarVibracion(): void {
    if (this.store.isEmergencyActive()) return;
    const vitrinas = ['sw420-vitrina-figuras-1', 'sw420-vitrina-figuras-2', 'sw420-vitrina-figuras-3'];
    for (const id of vitrinas) {
      const valor = Math.random() < 0.01 ? 1 : 0;
      if (valor === 0) continue;
      this.publish('tienda/vibracion', {
        sensorId: id,
        tipo: 'vibracion',
        valor,
        unidad: 'evento',
        fecha: new Date().toISOString(),
      });
    }
  }

  /**
   * SCT-013-030: consumo electrico en W. Random walk alrededor de 280W.
   * Una caida brusca a 0 = corte de luz (el escenario `corte_luz` lo fuerza).
   */
  private publicarCorriente(): void {
    if (this.store.isEmergencyActive()) return;
    const drift = (280 - this.corrienteActual) * 0.1;
    const ruido = (Math.random() - 0.5) * 30;
    const nueva = this.clamp(this.corrienteActual + drift + ruido, 150, 450);
    this.corrienteActual = Math.round(nueva);

    this.publish('tienda/corriente', {
      sensorId: 'sct013-030-principal',
      tipo: 'corriente',
      valor: this.corrienteActual,
      unidad: 'W',
      fecha: new Date().toISOString(),
    });
  }

  private publicarBuzzer(): void {
    if (this.store.isEmergencyActive()) return;
    this.publish('tienda/buzzer', {
      sensorId: 'buzzer-5v-principal',
      tipo: 'buzzer',
      valor: 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
  }

  private publish(topic: string, payload: Record<string, unknown>): void {
    this.store.setReading({
      sensorId: String(payload.sensorId),
      tipo: String(payload.tipo),
      valor: Number(payload.valor),
      unidad: String(payload.unidad),
      fecha: String(payload.fecha),
    });
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
