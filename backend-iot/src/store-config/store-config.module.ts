import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StoreConfig,
  StoreConfigSchema,
} from './schemas/store-config.schema';
import { StoreConfigController } from './store-config.controller';
import { StoreConfigService } from './store-config.service';

/**
 * Modulo de configuracion de la tienda.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoreConfig.name, schema: StoreConfigSchema },
    ]),
  ],
  controllers: [StoreConfigController],
  providers: [StoreConfigService],
  exports: [StoreConfigService],
})
export class StoreConfigModule {}
