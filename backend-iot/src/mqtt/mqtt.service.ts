import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Servicio MQTT. Se conecta al broker Mosquitto cuando arranca el modulo
 * y se queda escuchando los topicos de la tienda.
 *
 * Esta marcado como @Global en su modulo, asi que cualquier otro servicio
 * puede inyectar MqttService sin necesidad de importar MqttModule.
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client!: mqtt.MqttClient;
  private conectado = false;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly store: InMemoryStoreService,
  ) {}

  onModuleInit(): void {
    const brokerUrl = this.config.get<string>(
      'MQTT_BROKER_URL',
      'mqtt://localhost:1883',
    );

    this.client = mqtt.connect(brokerUrl, {
      username: this.config.get<string>('MQTT_USERNAME') || undefined,
      password: this.config.get<string>('MQTT_PASSWORD') || undefined,
    });

    this.client.on('connect', () => {
      this.conectado = true;
      this.logger.log(`Conectado al broker MQTT: ${brokerUrl}`);

      // Nos suscribimos a todos los topicos que empiecen con "tienda/".
      this.client.subscribe('tienda/#', (err) => {
        if (err) {
          this.logger.error('No se pudo suscribir a tienda/#', err);
          return;
        }
        this.logger.log('Suscrito a topicos tienda/#');
      });
    });

    this.client.on('disconnect', () => {
      this.conectado = false;
      this.logger.warn('Desconectado del broker MQTT');
    });

    this.client.on('close', () => {
      this.conectado = false;
    });

    this.client.on('error', (err) => {
      this.logger.error('Error de conexion MQTT', err);
    });

    this.client.on('message', (topic, payload) => {
      this.rutearMensaje(topic, payload.toString());
    });
  }

  /**
   * Procesa un mensaje recibido del broker. Mapea los topicos del ESP32
   * (firmware en infra/hardware/firmware/main.ino) al store en memoria
   * para que el dashboard del movil vea datos reales.
   *
   *   tienda/ambiente/temperatura -> guarda StoredReading temperatura
   *   tienda/ambiente/humedad     -> guarda StoredReading humedad
   *   tienda/sistema/status       -> heartbeat (online/offline), solo log
   *   tienda/comandos/buzzer      -> comando saliente, ignorar al recibirlo
   */
  private rutearMensaje(topic: string, payload: string): void {
    const fecha = new Date().toISOString();

    if (topic === 'tienda/ambiente/temperatura') {
      const valor = parseFloat(payload);
      if (Number.isNaN(valor)) {
        this.logger.warn(`Payload invalido en ${topic}: ${payload}`);
        return;
      }
      this.store.setReading({
        sensorId: 'dht22-ambiente',
        tipo: 'temperatura',
        valor,
        unidad: '°C',
        fecha,
      });
      return;
    }

    if (topic === 'tienda/ambiente/humedad') {
      const valor = parseFloat(payload);
      if (Number.isNaN(valor)) {
        this.logger.warn(`Payload invalido en ${topic}: ${payload}`);
        return;
      }
      this.store.setReading({
        sensorId: 'dht22-ambiente',
        tipo: 'humedad',
        valor,
        unidad: '%',
        fecha,
      });
      return;
    }

    if (topic === 'tienda/sistema/status') {
      this.logger.log(`Heartbeat ESP32: ${payload}`);
      return;
    }

    if (topic === 'tienda/comandos/buzzer') {
      // Es un comando que NOSOTROS publicamos al ESP32. Lo vemos rebotar
      // por la suscripcion a tienda/# y lo ignoramos.
      return;
    }

    this.logger.debug(`MQTT no ruteado ${topic}: ${payload}`);
  }

  /**
   * Cierra limpiamente la conexión al broker cuando el módulo se destruye.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.endAsync();
    }
  }

  /**
   * Indica si actualmente estamos conectados al broker MQTT.
   * Lo usa el HealthController para reportar el estado del servicio.
   */
  isConnected(): boolean {
    return this.conectado;
  }

  /**
   * Publica un mensaje en un tópico MQTT. Lo usa SimulatorService y
   * cualquier flujo que necesite enviar comandos a dispositivos reales
   * (ej. tienda/comandos/buzzer).
   */
  publish(topic: string, message: string): void {
    this.client.publish(topic, message);
  }
}
