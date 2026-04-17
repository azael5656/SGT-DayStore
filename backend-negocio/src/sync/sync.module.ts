import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

/**
 * Modulo de sincronizacion.
 * Gestiona la sincronizacion offline-first con la app movil.
 */
@Module({
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
