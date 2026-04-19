import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

/**
 * Modulo de sincronizacion offline-first con la app movil.
 * No registra entidades propias: se apoya en los repositorios de los
 * otros modulos (products, categories, sales).
 */
@Module({
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
