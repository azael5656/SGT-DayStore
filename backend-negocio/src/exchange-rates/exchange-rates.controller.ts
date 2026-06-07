import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { ExchangeRatesService } from './exchange-rates.service';

interface JwtUser {
  sub: string;
  email: string;
  role: 'superadmin' | 'admin' | 'vendedor';
}

/**
 * Endpoints de tasas de cambio.
 *
 *  - **POST /exchange-rates**: subir tasa nueva. Solo admin/superadmin.
 *  - **GET /exchange-rates**: historial. Todos los autenticados.
 *  - **GET /exchange-rates/current**: tasas vigentes ahora. Lo usan los
 *    clientes (web/mobile) para mostrar conversiones en vivo.
 */
@Controller('exchange-rates')
@Roles('superadmin', 'admin', 'vendedor')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Post()
  @Roles('superadmin', 'admin')
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateExchangeRateDto,
  ) {
    return this.service.create(user, dto);
  }

  @Get('current')
  @Roles('superadmin', 'admin', 'vendedor')
  async getCurrent() {
    return this.service.getCurrentRates();
  }

  @Get()
  @Roles('superadmin', 'admin', 'vendedor')
  async findAll(@Query('currency') currency?: 'VES' | 'COP') {
    return this.service.findAll(currency);
  }
}
