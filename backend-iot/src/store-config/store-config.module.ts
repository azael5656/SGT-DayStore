import { Module } from '@nestjs/common';
import { StoreConfigController } from './store-config.controller';
import { StoreConfigService } from './store-config.service';

/**
 * Modulo de configuracion de tienda.
 * Gestiona horarios, modo nocturno y parametros de la tienda.
 */
@Module({
  controllers: [StoreConfigController],
  providers: [StoreConfigService],
  exports: [StoreConfigService],
})
export class StoreConfigModule {}
