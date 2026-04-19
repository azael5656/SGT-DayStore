import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { SalesService } from './sales.service';

/**
 * Endpoints de ventas y reportes.
 *
 * - POST /sales: registrar una venta (owner y employee).
 * - GET /sales: listar ventas (owner y employee).
 * - GET /sales/:id: ver detalle de una venta.
 * - GET /sales/report/daily: reporte diario (solo owner).
 * - GET /sales/report/monthly: reporte mensual (solo owner).
 */
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(user.sub, dto);
  }

  @Get()
  async findAll() {
    return this.salesService.findAll();
  }

  @Get('report/daily')
  @Roles('owner')
  async reportDaily(@Query() query: QueryReportDto) {
    return this.salesService.reportDaily(query);
  }

  @Get('report/monthly')
  @Roles('owner')
  async reportMonthly(@Query() query: QueryReportDto) {
    return this.salesService.reportMonthly(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
