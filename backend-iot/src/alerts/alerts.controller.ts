import { Controller } from '@nestjs/common';
import { AlertsService } from './alerts.service';

/**
 * Controlador de alertas.
 * Endpoints: GET /alerts, GET /alerts/:id, PUT /alerts/:id/acknowledge,
 * GET /alerts/stats
 *
 * TODO: Implementar endpoints de consulta y reconocimiento de alertas
 */
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}
}
