import { Controller, Get, Param, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';

/**
 * Endpoints de alertas. Requieren autenticacion JWT.
 */
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findAll() {
    return this.alertsService.findAll();
  }

  @Get('stats')
  async stats() {
    return this.alertsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.alertsService.findOne(id);
  }

  @Put(':id/acknowledge')
  async acknowledge(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.alertsService.acknowledge(id, user.sub);
  }
}
