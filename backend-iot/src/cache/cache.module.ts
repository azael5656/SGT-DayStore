import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Modulo global de cache con Redis.
 * Disponible en todos los modulos sin necesidad de importarlo.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
