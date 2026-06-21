import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  InMemoryStoreService,
  StoredReading,
} from '../shared/in-memory-store.service';

/**
 * Vigila que cada sensor siga "vivo" y levanta una alerta cuando uno deja de
 * dar senal (sensor/equipo desconectado, sin energia o sin red).
 *
 * DINAMICO: no hay catalogo fijo de hardware. Un sensor entra a vigilancia en
 * cuanto reporta su primera lectura, asi la UI solo muestra/alerta lo que
 * realmente esta conectado (hoy DHT22 + santa maria + buzzer; manana lo que se
 * sume, sin tocar codigo). Punto unico de decision, igual que SantaMariaService:
 * se apoya en los eventos del store (cubre hardware real via MQTT, simulador y
 * mock sin duplicar logica).
 *
 * Dos formas de detectar el silencio, segun la unidad de la lectura:
 *  - CONTINUOS (temp/humedad, unidades °C/%/W...): publican en loop. Si pasan
 *    TIMEOUT_CONTINUO_MS sin una lectura suya -> desconectado.
 *  - POR EVENTO/ACTUADOR (puerta, buzzer; unidad 'estado'/'evento'): binarios,
 *    solo emiten al cambiar y pueden estar callados horas, asi que su senal de
 *    vida NO son sus lecturas sino el heartbeat del ESP32 (tienda/sistema/status)
 *    y la telemetria continua del mismo equipo. Si el ESP32 reporta 'offline'
 *    (LWT) o el equipo queda mudo, caen junto con el.
 *
 * Una sola alerta `sensor_desconectado` (severidad alta, visual) que lista los
 * sensores caidos; se auto-resuelve en cuanto vuelven a dar senal.
 */

interface SensorVisto {
  sensorId: string;
  /** Tipos de lectura emitidos (para que la UI sepa qué tarjetas marcar). */
  tipos: Set<string>;
  /** true = binario/actuador (unidad estado/evento): vigila por heartbeat. */
  esEvento: boolean;
  /** Ultima lectura propia (ms). */
  ultimaSenal: number;
}

@Injectable()
export class SensorWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SensorWatchdogService.name);

  static readonly TIPO_ALERTA = 'sensor_desconectado';
  private static readonly INTERVALO_CHEQUEO_MS = 5_000;
  // Continuo: el DHT22 publica cada 5s -> 20s = 4 ciclos perdidos.
  private static readonly TIMEOUT_CONTINUO_MS = 20_000;
  // Por evento: heartbeat cada 15s -> 45s = 3 perdidos.
  private static readonly TIMEOUT_EVENTO_MS = 45_000;

  // Nombres legibles solo para el mensaje de alerta; si un sensor nuevo no esta
  // aqui, se usa su id (sigue siendo dinamico, esto es cosmetico).
  private static readonly NOMBRES: Record<string, string> = {
    'dht22-ambiente': 'DHT22 (temperatura/humedad)',
    'mc38-santa-maria': 'Santa maria (puerta)',
    'buzzer-5v-principal': 'Buzzer (alarma)',
  };

  /** Sensores que han reportado al menos una vez (registro dinamico). */
  private readonly vistos = new Map<string, SensorVisto>();
  /** Ultima senal de vida del equipo: telemetria continua o un heartbeat. */
  private ultimaSenalDispositivo = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Firma del conjunto offline ya alertado, para no re-empujar cada tick. */
  private firmaOffline = '';

  constructor(private readonly store: InMemoryStoreService) {}

  onModuleInit(): void {
    // Asumimos vivo al arrancar hasta que un sensor reporte o llegue heartbeat.
    this.ultimaSenalDispositivo = Date.now();

    this.store.events.on('reading', (r: StoredReading) => this.registrar(r));

    this.store.events.on('device.status', (online: boolean) => {
      if (online) this.ultimaSenalDispositivo = Date.now();
      // Reaccionamos de inmediato: el 'offline' del LWT no debe esperar al tick.
      this.evaluar();
    });

    this.timer = setInterval(
      () => this.evaluar(),
      SensorWatchdogService.INTERVALO_CHEQUEO_MS,
    );
    this.logger.log('SensorWatchdog activo: vigilando desconexion de sensores');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Registra/actualiza un sensor cada vez que reporta. La unidad define si es
   * continuo o por-evento. Solo la telemetria continua cuenta como senal de
   * vida del equipo: las lecturas de actuadores (buzzer) y binarios son escasas
   * o las genera el backend, y enmascararian una caida real.
   */
  private registrar(r: StoredReading): void {
    const esEvento = r.unidad === 'estado' || r.unidad === 'evento';
    const t = Date.now();
    let s = this.vistos.get(r.sensorId);
    if (!s) {
      s = { sensorId: r.sensorId, tipos: new Set(), esEvento, ultimaSenal: t };
      this.vistos.set(r.sensorId, s);
    }
    s.tipos.add(r.tipo);
    s.esEvento = esEvento;
    s.ultimaSenal = t;
    if (!esEvento) this.ultimaSenalDispositivo = t;
  }

  private evaluar(): void {
    const ahora = Date.now();
    // El LWT del broker es la senal mas fuerte: si el ESP32 reporto 'offline',
    // todo lo que cuelga de el esta caido, sin esperar timeouts.
    const equipoCaido = this.store.getDeviceStatus() === false;

    const offline: SensorVisto[] = [];
    for (const s of this.vistos.values()) {
      if (equipoCaido) {
        offline.push(s);
        continue;
      }
      const ultima = s.esEvento ? this.ultimaSenalDispositivo : s.ultimaSenal;
      const timeout = s.esEvento
        ? SensorWatchdogService.TIMEOUT_EVENTO_MS
        : SensorWatchdogService.TIMEOUT_CONTINUO_MS;
      if (ahora - ultima > timeout) offline.push(s);
    }

    // Solo actuamos cuando cambia el conjunto de caidos: evita re-empujar la
    // misma alerta (y re-emitir por socket) en cada tick.
    const firma = offline
      .map((s) => s.sensorId)
      .sort()
      .join(',');
    if (firma === this.firmaOffline) return;
    this.firmaOffline = firma;

    // Publicamos la lista estructurada para que la UI marque las tarjetas en
    // vivo (lista vacia = todo reconectado).
    this.store.setSensoresDesconectados(
      offline.map((s) => ({
        sensorId: s.sensorId,
        nombre: SensorWatchdogService.NOMBRES[s.sensorId] ?? s.sensorId,
        tipos: [...s.tipos],
      })),
    );

    if (offline.length === 0) {
      const resueltas = this.store.resolveAlertsByTipo(
        SensorWatchdogService.TIPO_ALERTA,
      );
      if (resueltas.length) {
        this.logger.log(
          'Sensores reconectados: alerta de desconexion resuelta',
        );
      }
      return;
    }

    const nombres = offline
      .map((s) => SensorWatchdogService.NOMBRES[s.sensorId] ?? s.sensorId)
      .join(', ');
    this.store.pushAlert({
      tipo: SensorWatchdogService.TIPO_ALERTA,
      severidad: 'alta',
      mensaje: `Sin senal de: ${nombres}. Revisar conexion/energia del equipo.`,
    });
    this.logger.warn(`Sensor(es) desconectado(s): ${nombres}`);
  }
}
