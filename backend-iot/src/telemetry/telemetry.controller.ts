import { Controller, Get, Param } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

/**
 * Endpoints de consulta de telemetria.
 * Todas las rutas requieren token JWT (AuthGuard global).
 */
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('latest')
  async latest() {
    return this.telemetryService.findLatest();
  }

  @Get('dashboard')
  async dashboard() {
    return this.telemetryService.getDashboard();
  }

  @Get('history/:sensorId')
  async history(@Param('sensorId') sensorId: string) {
    return this.telemetryService.getHistory(sensorId);
  }
}
