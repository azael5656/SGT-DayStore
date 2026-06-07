import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/constants';

/**
 * Cliente Socket.IO para eventos IoT en tiempo real.
 *
 * Se conecta al gateway nginx (que enruta /socket.io/ al backend-iot).
 * Expone un singleton que las pantallas comparten — evita abrir multiples
 * conexiones si Dashboard y Alertas estan montadas a la vez.
 *
 * TODO: anadir handshake con JWT cuando el backend lo soporte.
 */

let socket: Socket | null = null;

export function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function disconnectRealtime(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
