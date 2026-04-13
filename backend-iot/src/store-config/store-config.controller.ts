import { Controller } from '@nestjs/common';
import { StoreConfigService } from './store-config.service';

/**
 * Controlador de configuracion de tienda.
 * Endpoints: GET /store/config, PUT /store/config
 *
 * TODO: Implementar endpoints de configuracion
 */
@Controller('store')
export class StoreConfigController {
  constructor(private readonly storeConfigService: StoreConfigService) {}
}
