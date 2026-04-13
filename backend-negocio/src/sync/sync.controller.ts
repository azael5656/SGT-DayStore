import { Controller } from '@nestjs/common';
import { SyncService } from './sync.service';

/**
 * Controlador de sincronizacion.
 * Endpoints: POST /sync/pull, POST /sync/push
 *
 * TODO: Implementar endpoints de sincronizacion offline-first
 */
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}
}
