import { Injectable, Logger } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Lógica de escenarios de demo.
 *
 * Cada escenario hace dos cosas:
 *  1) Escribir lecturas forzadas al store (para que Dashboard del móvil
 *     las vea inmediatamente).
 *  2) Publicar los mismos valores por MQTT (para que cuando el handler
 *     real esté implementado también queden persistidos en Mongo).
 *
 * Adicionalmente, incendio y forzado generan una alerta `critica`, que
 * hace vibrar el teléfono del dueño gracias a AlertBanner.tsx.
 */

export type Escenario = 'incendio' | 'forzado' | 'normal';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private readonly store: InMemoryStoreService,
    private readonly mqtt: MqttService,
  ) {}

  ejecutar(escenario: Escenario) {
    switch (escenario) {
      case 'incendio':
        return this.incendio();
      case 'forzado':
        return this.forzado();
      case 'normal':
        return this.normal();
    }
  }

  private incendio() {
    const temp = 38 + Math.random() * 4;
    this.publicarLectura({
      sensorId: 'esp32-temperatura-bodega',
      tipo: 'temperatura',
      valor: Math.round(temp * 10) / 10,
      unidad: '°C',
      fecha: new Date().toISOString(),
    });

    const alerta = this.store.pushAlert({
      tipo: 'temperatura',
      severidad: 'critica',
      mensaje: `Temperatura critica ${Math.round(temp)}°C — posible incendio`,
    });
    this.logger.warn(`🔥 Escenario INCENDIO lanzado (${alerta.id})`);
    return { escenario: 'incendio', alertaId: alerta.id, temperatura: temp };
  }

  private forzado() {
    this.publicarLectura({
      sensorId: 'esp32-puerta-principal',
      tipo: 'puerta',
      valor: 1,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });
    this.publicarLectura({
      sensorId: 'esp32-movimiento-entrada',
      tipo: 'movimiento',
      valor: 1,
      unidad: 'evento',
      fecha: new Date().toISOString(),
    });

    const alerta = this.store.pushAlert({
      tipo: 'forzado',
      severidad: 'critica',
      mensaje: 'Intento de forzado detectado — puerta abierta fuera de horario con movimiento',
    });
    this.logger.warn(`🚨 Escenario FORZADO lanzado (${alerta.id})`);
    return { escenario: 'forzado', alertaId: alerta.id };
  }

  private normal() {
    // Repone temperatura a un valor confortable y cierra la puerta.
    this.publicarLectura({
      sensorId: 'esp32-temperatura-bodega',
      tipo: 'temperatura',
      valor: 22,
      unidad: '°C',
      fecha: new Date().toISOString(),
    });
    this.publicarLectura({
      sensorId: 'esp32-puerta-principal',
      tipo: 'puerta',
      valor: 0,
      unidad: 'estado',
      fecha: new Date().toISOString(),
    });

    // Limpia alertas pendientes.
    this.store.clearAlerts();
    this.logger.log('✅ Escenario NORMAL aplicado (alertas limpiadas)');
    return { escenario: 'normal', mensaje: 'Estado estable, alertas limpiadas' };
  }

  private publicarLectura(lectura: {
    sensorId: string;
    tipo: string;
    valor: number;
    unidad: string;
    fecha: string;
  }) {
    this.store.setReading(lectura);
    try {
      this.mqtt.publish(`tienda/${lectura.tipo}`, JSON.stringify(lectura));
    } catch {
      /* silent: MQTT puede no estar disponible en demo local */
    }
  }
}
