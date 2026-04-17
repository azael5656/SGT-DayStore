import { Controller } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

/**
 * Controlador de telemetria.
 * Endpoints: GET /telemetry/latest, GET /telemetry/history/:sensor_id,
 * GET /telemetry/dashboard
 *
 * TODO: Implementar endpoints de consulta de telemetria
 */
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}
}
