import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { MqttService } from './mqtt/mqtt.service';

/**
 * Controlador de salud del microservicio IoT.
 * Expone GET /health publicamente para que balanceadores y monitoreo
 * puedan chequear el estado del servicio y su conexion al broker MQTT.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly mqttService: MqttService) {}

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'backend-iot',
      timestamp: new Date().toISOString(),
      mqtt_connected: this.mqttService.isConnected(),
    };
  }
}
