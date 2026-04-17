import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';

/**
 * Servicio MQTT para comunicacion con el ESP32 y los sensores.
 * Se conecta al broker Mosquitto y se suscribe a los topicos de la tienda.
 * Modulo global: disponible en todos los modulos sin importarlo.
 *
 * TODO: Implementar suscripcion a topicos y procesamiento de mensajes
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client!: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(private readonly config: ConfigService) {}

  /** Conecta al broker MQTT al iniciar el modulo */
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
      this.logger.log(`Conectado al broker MQTT: ${brokerUrl}`);
      // TODO: Suscribirse a topicos de la tienda (tienda/#)
    });

    this.client.on('error', (err) => {
      this.logger.error('Error de conexion MQTT', err);
    });
  }

  /** Desconecta del broker MQTT al destruir el modulo */
  async onModuleDestroy(): Promise<void> {
    await this.client.endAsync();
  }

  /**
   * Publica un mensaje en un topico MQTT.
   * @param topic - Topico destino
   * @param message - Mensaje a publicar
   */
  publish(topic: string, message: string): void {
    this.client.publish(topic, message);
  }
}
