import { Module } from '@nestjs/common';
import { SalesModule } from '../sales/sales.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

/**
 * Módulo de sincronización offline-first con la app móvil.
 *
 * - `DataSource` (TypeORM, global) para el pull de catálogo.
 * - `SalesModule` aporta `SalesService.createFromSync` para aplicar las
 *   ventas creadas offline (idempotente, oversell permitido).
 */
@Module({
  imports: [SalesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
