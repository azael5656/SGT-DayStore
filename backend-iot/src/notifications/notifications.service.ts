import { Injectable } from '@nestjs/common';

/**
 * Servicio de notificaciones.
 * Envia notificaciones push via Firebase Cloud Messaging (FCM)
 * y mantiene un historial de notificaciones enviadas en MongoDB.
 *
 * TODO: Implementar envio de push con FCM y almacenamiento de historial
 */
@Injectable()
export class NotificationsService {}
