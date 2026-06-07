import { Controller, Get, Param, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

/**
 * Endpoints de notificaciones push.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.findByUser(user.sub);
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }
}
