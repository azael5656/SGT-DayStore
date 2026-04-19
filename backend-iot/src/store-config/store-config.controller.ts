import { Body, Controller, Get, Put } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';
import { StoreConfigService } from './store-config.service';

/**
 * Endpoints de configuracion de la tienda.
 * Solo el dueño puede modificar la configuracion. Los empleados solo leen.
 */
@Controller('store/config')
export class StoreConfigController {
  constructor(private readonly storeConfigService: StoreConfigService) {}

  @Get()
  async get() {
    return this.storeConfigService.get();
  }

  @Put()
  @Roles('owner')
  async update(@Body() dto: UpdateStoreConfigDto) {
    return this.storeConfigService.update(dto);
  }
}
