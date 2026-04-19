import { Global, Module } from '@nestjs/common';
import { InMemoryStoreService } from './in-memory-store.service';

/**
 * Módulo global de utilidades compartidas en memoria.
 * El store vive solo mientras corre el proceso — apto para demo / dev,
 * NO para producción.
 */
@Global()
@Module({
  providers: [InMemoryStoreService],
  exports: [InMemoryStoreService],
})
export class SharedModule {}
