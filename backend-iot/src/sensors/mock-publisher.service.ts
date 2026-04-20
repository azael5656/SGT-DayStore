import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MqttService } from '../mqtt/mqtt.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';
import { StoreConfigService } from '../store-config/store-config.service';

/**
 * Publicador simulado del hardware de la tienda.
 *
 * Hardware modelado:
 *  - 1 DHT22 ambiente          -> temperatura + humedad (lectura continua)
 *  - 1 MC-38 santa maria       -> puerta del local (evento al abrir/cerrar)
 *  - 2 SW-420 en vitrinas      -> golpe/vibracion (evento al intentar forzar)
 *  - 1 PIR HC-SR501 interior   -> movimiento (solo interesante fuera de horario)
 *  - 1 SCT-013 principal       -> consumo electrico (continuo)
 *  - 1 buzzer 5V               -> actuador (lo prenden los escenarios)
 *
 * Politica de publicacion:
 *  - CONTINUOS (temp, hum, corriente): tick cada X segundos, drift suave.
 *  - BINARIOS (puerta, vibracion, buzzer): publican SOLO cuando hay evento
 *    real. No spameamos 0s cada pocos segundos. El estado "negativo"
 *    (cerrada, estable, silencio) se emite UNA sola vez al arranque como
 *    estado inicial y despues queda asi hasta que un escenario lo cambie.
 *  - MOVIMIENTO: solo se publica FUERA de horario comercial. En horario es
 *    ruido inutil (esperamos movimiento). Fuera de horario genera alerta
 *    severidad 'alta' (visual, SIN sonido).
 *
 * El sonido del buzzer se controla desde SimulatorService cuando corre un
 * escenario critico (incendio/forzado/corte_luz).
 */
@Injectable()
export class MockPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MockPublisherService.name);
  private timers: ReturnType<typeof setInterval>[] = [];
  private temperaturaActual = 22;
  private humedadActual = 55;
  private corrienteActual = 280;

  constructor(
    private readonly config: ConfigService,
    private readonly mqtt: MqttService,
    private readonly store: InMemoryStoreService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  onModuleInit(): void {
    const habilitado = this.config.get<string>('MOCK_SENSORS') === 'true';
    if (!habilitado) return;

    this.logger.log(
      'Simulador de sensores ACTIVO (MOCK_SENSORS=true). Publicando a tienda/#',
    );

    this.publicarEstadoInicial();

    // Solo los sensores analogicos corren en loop.
    this.timers.push(setInterval(() => this.publicarTemperatura(), 2000));
    this.timers.push(setInterval(() => this.publicarHumedad(), 3000));
    this.timers.push(setInterval(() => this.publicarCorriente(), 3000));
    this.timers.push(setInterval(() => void this.evaluarMovimiento(), 5000));
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  /**
   * Publica una lectura base de cada sensor para que el dashboard muestre
   * TODOS los sensores desde el arranque. Los binarios quedan en 0 hasta
   * que un escenario o evento real cambie el estado.
   */
  private publicarEstadoInicial(): void {
    const ts = new Date().toISOString();
    const base = [
      { sensorId: 'dht22-ambiente', tipo: 'temperatura', valor: this.temperaturaActual, unidad: '°C' },
      { sensorId: 'dht22-ambiente', tipo: 'humedad', valor: this.humedadActual, unidad: '%' },
      { sensorId: 'mc38-santa-maria', tipo: 'puerta', valor: 0, unidad: 'estado' },
      { sensorId: 'sw420-vitrina-1', tipo: 'vibracion', valor: 0, unidad: 'evento' },
      { sensorId: 'sw420-vitrina-2', tipo: 'vibracion', valor: 0, unidad: 'evento' },
      { sensorId: 'pir-hcsr501-interior', tipo: 'movimiento', valor: 0, unidad: 'evento' },
      { sensorId: 'sct013-030-principal', tipo: 'corriente', valor: this.corrienteActual, unidad: 'W' },
      { sensorId: 'buzzer-5v-principal', tipo: 'buzzer', valor: 0, unidad: 'estado' },
    ];
    for (const l of base) this.publish(`tienda/${l.tipo}`, { ...l, fecha: ts });
  }

  /**
   * Temperatura: drift suave hacia el objetivo del horario + ruido chico.
   * Cambios de ~0.05-0.15 grados cada 2s. Alcanza el objetivo en ~1-2 min.
   */
  private publicarTemperatura(): void {
    if (this.store.isEmergencyActive()) return;
    const hora = new Date().getHours();
    const objetivo = hora >= 10 && hora <= 18 ? 26 : 22;
    const drift = (objetivo - this.temperaturaActual) * 0.04;
    const ruido = (Math.random() - 0.5) * 0.1;
    const nueva = this.clamp(this.temperaturaActual + drift + ruido, 18, 32);
    this.temperaturaActual = Math.round(nueva * 10) / 10;

    this.publish('tienda/temperatura', {
      sensorId: 'dht22-ambiente',
      tipo: 'temperatura',
      valor: this.temperaturaActual,
      unidad: '°C',
      fecha: new Date().toISOString(),
    });
  }

  /** Humedad: cambios de ~0.5-1% por lectura, muy suaves. */
  private publicarHumedad(): void {
    if (this.store.isEmergencyActive()) return;
    const drift = (55 - this.humedadActual) * 0.03;
    const ruido = (Math.random() - 0.5) * 0.8;
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

  /** Consumo electrico con pequena variacion por carga de la tienda. */
  private publicarCorriente(): void {
    if (this.store.isEmergencyActive()) return;
    const drift = (280 - this.corrienteActual) * 0.1;
    const ruido = (Math.random() - 0.5) * 20;
    const nueva = this.clamp(this.corrienteActual + drift + ruido, 180, 400);
    this.corrienteActual = Math.round(nueva);

    this.publish('tienda/corriente', {
      sensorId: 'sct013-030-principal',
      tipo: 'corriente',
      valor: this.corrienteActual,
      unidad: 'W',
      fecha: new Date().toISOString(),
    });
  }

  /**
   * PIR: lee la config real de la tienda (horario, vacaciones, modo
   * nocturno, dias cerrados, cierre temprano). Si la tienda esta abierta,
   * ignora el movimiento (es normal). Si esta cerrada, publica la lectura
   * y crea alerta severidad 'alta' sin sonido.
   */
  private async evaluarMovimiento(): Promise<void> {
    if (this.store.isEmergencyActive()) return;
    const abierta = await this.storeConfig.isOpenNow();
    if (abierta) return;
    if (Math.random() >= 0.03) return;

    const ts = new Date().toISOString();
    this.publish('tienda/movimiento', {
      sensorId: 'pir-hcsr501-interior',
      tipo: 'movimiento',
      valor: 1,
      unidad: 'evento',
      fecha: ts,
    });
    this.store.pushAlert({
      tipo: 'movimiento',
      severidad: 'alta',
      mensaje: 'Movimiento detectado con la tienda cerrada',
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
