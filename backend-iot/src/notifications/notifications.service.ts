import { Injectable } from '@nestjs/common';

/**
 * Servicio de notificaciones.
 * Gestiona el historial de notificaciones push enviadas a los usuarios.
 *
 * TODO: inyectar @InjectModel(Notification.name) e integrar con Firebase
 * Cloud Messaging cuando se implemente el envio real.
 */
@Injectable()
export class NotificationsService {
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

  async markAsRead(id: string, userId: string) {
    // TODO: actualizar leida=true, leidaEn=now en Mongo.
    return {
      id,
      userId,
      leida: true,
      leidaEn: new Date().toISOString(),
    };
  }
}
