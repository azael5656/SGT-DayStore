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

  @Get('is-open')
  async isOpen() {
    const abierta = await this.storeConfigService.isOpenNow();
    return { abierta };
  }

  @Put()
  @Roles('admin', 'superadmin')
  async update(@Body() dto: UpdateStoreConfigDto) {
    return this.storeConfigService.update(dto);
  }
}
