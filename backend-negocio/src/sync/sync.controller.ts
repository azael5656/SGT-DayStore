import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncService } from './sync.service';

/**
 * Endpoints de sincronizacion con la app movil.
 */
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('pull')
  async pull(@Body() dto: SyncPullDto) {
    return this.syncService.pull(dto);
  }

  @Post('push')
  async push(
    @CurrentUser() user: { sub: string },
    @Body() dto: SyncPushDto,
  ) {
    return this.syncService.push(user.sub, dto);
  }
}
