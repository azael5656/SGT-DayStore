import { Injectable } from '@nestjs/common';

/**
 * Servicio de notificaciones.
 *
 * ESTADO ACTUAL: MOCK. Ambos métodos retornan estructuras hardcoded.
 *
 * Decisión pendiente (ver TODO.md raíz):
 *  - Si el flujo realtime ya cubre las alertas via WebSocket
 *    (`events.gateway.ts`), este módulo puede borrarse.
 *  - Si se quiere historial persistente y push fuera de la app, falta
 *    implementar:
 *      1. Schema `Notification` (Mongoose).
 *      2. Persistencia: crear la entrada cuando llega una alerta crítica.
 *      3. Push real con Firebase Cloud Messaging (token del dispositivo
 *         guardado por usuario).
 */
@Injectable()
export class NotificationsService {
  /**
   * Devuelve las notificaciones del usuario. Hoy retorna una notificación
   * mock fija — se pierde el filtro real por `userId`.
   *
   * @param userId Id del usuario dueño de las notificaciones.
   */
  async findByUser(userId: string) {
    return [
      {
        id: 'mock-notif-1',
        userId,
        titulo: 'Alerta: Puerta abierta',
        cuerpo: 'La puerta principal se abrio fuera de horario',
        leida: false,
        fecha: new Date().toISOString(),
      },
    ];
  }

  /**
   * Marca una notificación como leída. Hoy NO persiste — devuelve el
   * objeto modificado en memoria pero al siguiente `findByUser` la
   * notificación seguirá apareciendo como no leída.
   *
   * @param id     Id de la notificación.
   * @param userId Usuario que la marca (para validar ownership real).
   */
  async markAsRead(id: string, userId: string) {
    return {
      id,
      userId,
      leida: true,
      leidaEn: new Date().toISOString(),
    };
  }
}
