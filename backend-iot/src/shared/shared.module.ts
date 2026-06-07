import { Global, Module } from '@nestjs/common';
import { AuditPublisherService } from './audit-publisher.service';
import { InMemoryStoreService } from './in-memory-store.service';

/**
 * Módulo global compartido.
 * - InMemoryStoreService: snapshot vivo + EventEmitter para websocket.
 * - AuditPublisherService: HTTP a backend-negocio para audit logs.
 */
@Global()
@Module({
  providers: [InMemoryStoreService, AuditPublisherService],
  exports: [InMemoryStoreService, AuditPublisherService],
})
export class SharedModule {}
