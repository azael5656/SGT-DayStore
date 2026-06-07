import { Logger, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InMemoryStoreService } from '../shared/in-memory-store.service';

/**
 * Gateway Socket.IO para eventos IoT en tiempo real.
 *
 * Clientes (el móvil y el panel web) se conectan a `/socket.io/` a través
 * del gateway nginx y reciben los siguientes eventos:
 *
 *  - `'reading'` (StoredReading): cada vez que llega una lectura nueva.
 *      Payload: `{ sensorId, tipo, valor, unidad, fecha }`.
 *  - `'alert'` (StoredAlert): cuando se dispara una alerta.
 *      Payload: `{ id, tipo, severidad, mensaje, fecha, reconocida }`.
 *  - `'alert.ack'` (StoredAlert): cuando un usuario reconoce una alerta.
 *      Payload: la alerta ya con `reconocida=true` y `reconocidaPor`.
 *  - `'alerts.cleared'` (sin payload): cuando se limpian todas las alertas
 *      (acción administrativa).
 *
 * Al conectarse, el gateway emite un evento `'snapshot'` con
 * `{ readings, alerts }` para que la UI no arranque vacía.
 *
 * AUTH: hoy está abierto a cualquier cliente — TODO validar JWT en
 * `handleConnection` (extraer `auth.token` del handshake con
 * `client.handshake.auth.token` y verificarlo con la llave pública).
 */
@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class EventsGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly store: InMemoryStoreService) {}

  onModuleInit(): void {
    this.store.events.on('reading', (reading) => {
      this.server.emit('reading', reading);
    });
    this.store.events.on('alert', (alert) => {
      this.server.emit('alert', alert);
    });
    this.store.events.on('alert.ack', (alert) => {
      this.server.emit('alert.ack', alert);
    });
    this.store.events.on('alerts.cleared', () => {
      this.server.emit('alerts.cleared');
    });
    this.logger.log('EventsGateway suscrito al store');
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Cliente conectado: ${client.id}`);
    // Snapshot inicial para que la UI no arranque vacía.
    client.emit('snapshot', {
      readings: this.store.getReadings(),
      alerts: this.store.getAlerts(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }
}
