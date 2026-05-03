import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';

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

  constructor(private readonly config: ConfigService) {}

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
      // Ejemplos: tienda/temperatura, tienda/puerta, tienda/movimiento.
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
      // TODO: rutear el mensaje al servicio correspondiente según el
      // tópico:
      //   - tienda/+/sensores/+ → TelemetryService.guardarLectura()
      //   - tienda/+/alertas    → AlertsService.crearDesdeMqtt()
      // Hoy solo logueamos para inspección manual.
      this.logger.debug(`MQTT ${topic}: ${payload.toString()}`);
    });
  }

  /**
   * Cierra limpiamente la conexión al broker cuando el módulo se destruye
   * (apagado del servicio). Sin esto el contenedor podría tardar en parar.
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
   * Publica un mensaje en un tópico MQTT. Lo usa SimulatorService al
   * emitir lecturas/alertas ficticias y, en el futuro, cualquier flujo
   * que necesite hablar con dispositivos reales.
   *
   * Si el cliente aún no está conectado, mqtt.js lo encola y lo enviará
   * cuando se establezca la conexión (sin garantía de orden estricta).
   *
   * @param topic   Tópico MQTT (ej. `tienda/123/sensores/temperatura`).
   * @param message Payload serializado (típicamente JSON.stringify).
   */
  publish(topic: string, message: string): void {
    this.client.publish(topic, message);
  }
}
