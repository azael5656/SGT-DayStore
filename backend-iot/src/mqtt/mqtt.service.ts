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

  // Topico de comando que escucha el ESP32 para encender/apagar su buzzer.
  private static readonly TOPIC_CMD_BUZZER = 'tienda/comandos/buzzer';
  // Ultimo estado comandado al buzzer fisico. Solo publicamos en transiciones
  // para no spamear el topico (null = aun no comandamos nada).
  private ultimoComandoBuzzer: boolean | null = null;

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

      // Reestablecemos un estado base conocido del buzzer al (re)conectar:
      // forzamos republicar el estado actual (con retain) por si el broker
      // tenia un "on" retenido viejo o el ESP32 acaba de bootear.
      this.ultimoComandoBuzzer = null;
      this.syncBuzzer();
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

    // El buzzer fisico lo gobierna el backend: debe sonar mientras exista una
    // alerta critica sin reconocer y callarse en cuanto se reconoce, se
    // resuelve o se limpian. Reaccionamos a cualquier cambio en las alertas
    // del store (mismo canal que usa el simulador y los flujos reales).
    this.store.events.on('alert', () => this.syncBuzzer());
    this.store.events.on('alert.ack', () => this.syncBuzzer());
    this.store.events.on('alerts.cleared', () => this.syncBuzzer());
  }

  // Tipos de alerta (no criticos) que igual deben sonar el buzzer fisico.
  // La puerta (santa maria) abierta fuera de horario es severidad 'alta' pero
  // amerita alarma sonora, no solo aviso visual.
  private static readonly TIPOS_BUZZER_NO_CRITICOS = new Set([
    'puerta_fuera_horario',
  ]);

  /**
   * Recalcula si el buzzer debe sonar y lo comanda. Regla: ON mientras haya al
   * menos una alerta sin reconocer que amerite alarma sonora (cualquier
   * critica, o la puerta abierta fuera de horario); OFF en cuanto se reconoce,
   * se resuelve o se limpian. Es el UNICO punto que gobierna el buzzer, asi la
   * alarma se apaga al instante al marcar la alerta como revisada (antes el
   * firmware la reactivaba solo cada 5s).
   */
  private syncBuzzer(): void {
    const debeSonar = this.store
      .getAlerts()
      .some(
        (a) =>
          !a.reconocida &&
          (a.severidad === 'critica' ||
            MqttService.TIPOS_BUZZER_NO_CRITICOS.has(a.tipo)),
      );
    this.comandarBuzzer(debeSonar);
  }

  /**
   * Aplica el estado del buzzer solo en las transiciones (no spamea):
   *  1) comanda el buzzer fisico del ESP32 (tienda/comandos/buzzer, retain
   *     para que un ESP32 que (re)arranque reciba el ultimo estado), y
   *  2) refleja el estado en el store (lectura 'buzzer') para que el dashboard
   *     web y la app lo vean por el socket, incluido el caso de la puerta.
   */
  private comandarBuzzer(encender: boolean): void {
    if (this.ultimoComandoBuzzer === encender) return;
    this.ultimoComandoBuzzer = encender;
    this.publish(MqttService.TOPIC_CMD_BUZZER, encender ? 'on' : 'off', {
      retain: true,
    });
    this.store.setReading({
      sensorId: 'buzzer-5v-principal',
      tipo: 'buzzer',
      valor: encender ? 1 : 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
    this.logger.log(`Buzzer -> ${encender ? 'ON' : 'OFF'}`);
  }

  // Umbrales para crear alertas a partir de lecturas reales del DHT22.
  // Valores calibrados para Tachira (San Cristobal, ~830 msnm).
  // Temperatura interior normal del local: 22-28 C. Humedad: 70-85 %.
  //   - 30 C: anormal para Tachira (aviso, revisar)
  //   - 35 C: peligroso, posible incendio o falla mayor (critica)
  //   - 85 %: hongo en cartones/posters (aviso)
  private static readonly UMBRAL_TEMP_ALTA = 30;
  private static readonly UMBRAL_TEMP_PELIGRO = 35;
  // 85 %: el DHT22 real en Tachira ronda 70-85 % en condiciones normales, asi
  // que con 70 la alerta 'alta_humedad' se disparaba en casi cada lectura. 85
  // es el punto donde ya hay riesgo de hongo en cartones/posters (aviso real).
  private static readonly UMBRAL_HUM_PCT = 85;
  /**
   * Procesa un mensaje recibido del broker. Mapea los topicos del ESP32
   * (firmware en infra/hardware/firmware/main/main.ino) al store en memoria
   * para que el dashboard del movil vea datos reales, y genera alertas
   * cuando una lectura cruza los umbrales.
   *
   *   tienda/ambiente/temperatura -> guarda StoredReading + alerta si > UMBRAL
   *   tienda/ambiente/humedad     -> guarda StoredReading + alerta si > UMBRAL
   *   tienda/seguridad/puerta     -> guarda StoredReading puerta (MC-38);
   *                                  SantaMariaService decide la alerta
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
      if (valor > MqttService.UMBRAL_TEMP_PELIGRO) {
        this.store.pushAlert({
          tipo: 'calor_peligroso',
          severidad: 'critica',
          mensaje: `Calor peligroso: ${valor.toFixed(1)} °C (umbral ${MqttService.UMBRAL_TEMP_PELIGRO}) — revisar local`,
        });
      } else if (valor > MqttService.UMBRAL_TEMP_ALTA) {
        this.store.pushAlert({
          tipo: 'alta_temperatura',
          severidad: 'media',
          mensaje: `Temperatura alta: ${valor.toFixed(1)} °C (umbral ${MqttService.UMBRAL_TEMP_ALTA})`,
        });
      }
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
      if (valor > MqttService.UMBRAL_HUM_PCT) {
        this.store.pushAlert({
          tipo: 'alta_humedad',
          severidad: 'media',
          mensaje: `Humedad alta: ${valor.toFixed(1)} % (umbral ${MqttService.UMBRAL_HUM_PCT})`,
        });
      }
      return;
    }

    if (topic === 'tienda/seguridad/puerta') {
      // El firmware publica "abierta" / "cerrada" (MC-38 en GPIO 23).
      const abierta = payload.trim().toLowerCase() === 'abierta';
      this.store.setReading({
        sensorId: 'mc38-santa-maria',
        tipo: 'puerta',
        valor: abierta ? 1 : 0,
        unidad: 'estado',
        fecha,
      });
      // La alerta "fuera de horario" la decide SantaMariaService al recibir
      // el evento 'reading'. Aqui solo registramos el estado crudo.
      return;
    }

    if (topic === 'tienda/sistema/status') {
      this.logger.log(`Heartbeat ESP32: ${payload}`);
      return;
    }

    if (topic === MqttService.TOPIC_CMD_BUZZER) {
      // Es un comando que NOSOTROS publicamos al ESP32. Lo vemos rebotar
      // por la suscripcion a tienda/# (y por el retain) y lo ignoramos.
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
   * (ej. tienda/comandos/buzzer). retain=true persiste el ultimo mensaje en
   * el broker para clientes que se suscriban despues (p.ej. el ESP32 al bootear).
   */
  publish(topic: string, message: string, opts?: { retain?: boolean }): void {
    this.client.publish(topic, message, { retain: opts?.retain ?? false });
  }
}
