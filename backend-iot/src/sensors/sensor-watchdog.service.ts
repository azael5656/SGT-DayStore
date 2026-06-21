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
 * Vigila que cada sensor fisico siga "vivo" y levanta una alerta cuando uno
 * deja de dar senal (sensor/equipo desconectado, sin energia o sin red).
 *
 * Punto unico de decision, igual que SantaMariaService: se apoya en los
 * eventos del store, asi cubre TODAS las fuentes (hardware real via MQTT,
 * simulador y mock) sin duplicar logica.
 *
 * Dos clases de sensor, dos formas de detectar el silencio:
 *  - CONTINUOS (DHT22): publican en loop (cada 5s segun firmware). Si pasan
 *    `timeoutMs` sin una lectura suya -> desconectado.
 *  - POR EVENTO (santa maria / MC-38): binarios, solo emiten al abrir/cerrar,
 *    pueden estar callados horas. Su senal de vida NO son sus lecturas sino el
 *    heartbeat del ESP32 (tienda/sistema/status, cada 15s) y las lecturas del
 *    resto de sensores del mismo equipo. Si el ESP32 reporta 'offline' (LWT) o
 *    el equipo queda mudo, caen junto con el.
 *
 * Una sola alerta `sensor_desconectado` (severidad alta, visual) que lista los
 * sensores caidos; se auto-resuelve en cuanto vuelven a dar senal. Para sumar
 * un sensor nuevo basta agregar una entrada a SENSORES.
 */

interface SensorVigilado {
  sensorId: string;
  nombre: string;
  /** Silencio maximo tolerado (ms) antes de marcarlo desconectado. */
  timeoutMs: number;
  /**
   * true = binario/por-evento: su senal de vida es el heartbeat del equipo,
   * no sus propias lecturas (no publica en loop).
   */
  porEvento?: boolean;
}

@Injectable()
export class SensorWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SensorWatchdogService.name);

  static readonly TIPO_ALERTA = 'sensor_desconectado';
  private static readonly INTERVALO_CHEQUEO_MS = 5_000;

  // Catalogo de sensores fisicos vigilados (hoy, un unico ESP32). Para agregar
  // uno nuevo basta sumar una entrada aqui.
  private static readonly SENSORES: SensorVigilado[] = [
    {
      sensorId: 'dht22-ambiente',
      nombre: 'DHT22 (temperatura/humedad)',
      // Firmware publica cada 5s. 20s = 4 ciclos perdidos (tolera jitter).
      timeoutMs: 20_000,
    },
    {
      sensorId: 'mc38-santa-maria',
      nombre: 'Santa maria (puerta)',
      // Binario: usa el heartbeat del equipo (cada 15s). 45s = 3 perdidos.
      timeoutMs: 45_000,
      porEvento: true,
    },
  ];

  /** Ultima vez (ms) que vimos una lectura de cada sensor del catalogo. */
  private readonly ultimaSenal = new Map<string, number>();
  /** Ultima senal de vida del equipo: cualquier lectura suya o un heartbeat. */
  private ultimaSenalDispositivo = 0;
  /** Ids que cuentan como "el equipo": solo sensores reales, no actuadores. */
  private readonly idsDispositivo = new Set(
    SensorWatchdogService.SENSORES.map((s) => s.sensorId),
  );
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Firma del conjunto offline ya alertado, para no re-empujar cada tick. */
  private firmaOffline = '';

  constructor(private readonly store: InMemoryStoreService) {}

  onModuleInit(): void {
    const ahora = Date.now();
    // Asumimos conectado al arrancar: sembramos timestamps para no disparar
    // una falsa desconexion durante la primera ventana, antes de la 1a lectura.
    this.ultimaSenalDispositivo = ahora;
    for (const s of SensorWatchdogService.SENSORES) {
      this.ultimaSenal.set(s.sensorId, ahora);
    }

    this.store.events.on('reading', (r: StoredReading) => {
      // Ignoramos actuadores (buzzer) y cualquier id ajeno: no son senal de
      // vida del equipo y enmascararian una caida real.
      if (!this.idsDispositivo.has(r.sensorId)) return;
      const t = Date.now();
      this.ultimaSenal.set(r.sensorId, t);
      this.ultimaSenalDispositivo = t;
    });

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

  private evaluar(): void {
    const ahora = Date.now();
    // El LWT del broker es la senal mas fuerte: si el ESP32 reporto 'offline',
    // todo lo que cuelga de el esta caido, sin esperar timeouts.
    const equipoCaido = this.store.getDeviceStatus() === false;

    const offline: SensorVigilado[] = [];
    for (const s of SensorWatchdogService.SENSORES) {
      if (equipoCaido) {
        offline.push(s);
        continue;
      }
      const ultima = s.porEvento
        ? this.ultimaSenalDispositivo
        : (this.ultimaSenal.get(s.sensorId) ?? 0);
      if (ahora - ultima > s.timeoutMs) offline.push(s);
    }

    // Solo actuamos cuando cambia el conjunto de caidos: evita re-empujar la
    // misma alerta (y re-emitir por socket) en cada tick.
    const firma = offline
      .map((s) => s.sensorId)
      .sort()
      .join(',');
    if (firma === this.firmaOffline) return;
    this.firmaOffline = firma;

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

    const nombres = offline.map((s) => s.nombre).join(', ');
    this.store.pushAlert({
      tipo: SensorWatchdogService.TIPO_ALERTA,
      severidad: 'alta',
      mensaje: `Sin senal de: ${nombres}. Revisar conexion/energia del equipo.`,
    });
    this.logger.warn(`Sensor(es) desconectado(s): ${nombres}`);
  }
}
