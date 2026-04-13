import { Global, Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';

/**
 * Modulo global de MQTT.
 * Provee el servicio de conexion al broker Mosquitto para todos los modulos.
 */
@Global()
@Module({
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
