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
 * Clientes (el móvil) se conectan a `/socket.io/` a través del gateway nginx
 * y reciben eventos cada vez que:
 *  - llega una lectura de sensor nueva  →  'reading'
 *  - se genera una alerta              →  'alert'
 *  - se reconoce una alerta            →  'alert.ack'
 *  - se limpian todas las alertas      →  'alerts.cleared'
 *
 * Al conectarse, enviamos un snapshot inicial para que el cliente no tenga
 * que hacer un GET extra.
 *
 * TODO: añadir auth (validar JWT por handshake). Para demo se deja abierto.
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
