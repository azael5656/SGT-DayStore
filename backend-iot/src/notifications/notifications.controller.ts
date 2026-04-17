import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/**
 * Controlador de notificaciones.
 * Endpoints: GET /notifications, PUT /notifications/:id/read
 *
 * TODO: Implementar endpoints de consulta de notificaciones
 */
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}
}
