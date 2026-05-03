import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { RegisterAbonoDto } from './dto/register-abono.dto';
import { SalesService } from './sales.service';

interface JwtUser {
  sub: string;
  email: string;
  role: 'superadmin' | 'admin' | 'vendedor';
}

/**
 * Endpoints de ventas y reportes.
 *
 * Roles:
 *  - **vendedor**: registra ventas, ve solo las suyas.
 *  - **admin**: ve todas, anula ventas, accede a reportes.
 *  - **superadmin**: además puede soft-deletar y ver inactivas.
 *
 * Las rutas estáticas (`reports/*`) van ANTES de las rutas con `:id`
 * para que el router no las mate como UUID.
 */
@Controller('sales')
@Roles('superadmin', 'admin', 'vendedor')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  /**
   * Registra una nueva venta. La transacción ACID garantiza atomicidad
   * (stock + venta + items en un solo commit).
   */
  @Post()
  @Roles('superadmin', 'admin', 'vendedor')
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user, dto);
  }

  /**
   * Lista ventas con filtros y paginación.
   * Vendedores solo ven las suyas; admin/superadmin ven todas.
   */
  @Get()
  @Roles('superadmin', 'admin', 'vendedor')
  async findAll(@CurrentUser() user: JwtUser, @Query() query: QuerySalesDto) {
    return this.salesService.findAll(user, query);
  }

  /**
   * Dashboard agregado del negocio. Devuelve todos los KPIs (ventas hoy/
   * semana/mes, top productos, deudas, distribución de pagos, serie 14d)
   * en un solo payload — pensado para pintar una pantalla tipo Power BI.
   */
  @Get('reports/dashboard')
  @Roles('superadmin', 'admin')
  async getDashboard() {
    return this.salesService.getDashboard();
  }

  /** Reporte diario: SUM(total), COUNT GROUP BY DATE(fecha). */
  @Get('reports/daily')
  @Roles('superadmin', 'admin')
  async reportDaily(@Query() query: QueryReportDto) {
    return this.salesService.reportDaily(query);
  }

  /** Reporte mensual: SUM(total), COUNT GROUP BY TO_CHAR(fecha,'YYYY-MM'). */
  @Get('reports/monthly')
  @Roles('superadmin', 'admin')
  async reportMonthly(@Query() query: QueryReportDto) {
    return this.salesService.reportMonthly(query);
  }

  /** Detalle de una venta. */
  @Get(':id')
  @Roles('superadmin', 'admin', 'vendedor')
  async findOne(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.salesService.findOne(user, id);
  }

  /**
   * Registra un abono adicional sobre una venta a crédito pendiente.
   * Roles: vendedor / admin / superadmin (cualquiera que cobre).
   */
  @Post(':id/abonos')
  @Roles('superadmin', 'admin', 'vendedor')
  async registerAbono(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RegisterAbonoDto,
  ) {
    return this.salesService.registerAbono(user, id, dto);
  }

  /**
   * Anula una venta y restaura el stock. Solo admin/superadmin.
   * Requiere `motivo` en el body para auditoría.
   */
  @Patch(':id/cancel')
  @Roles('superadmin', 'admin')
  async cancel(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelSaleDto,
  ) {
    return this.salesService.cancel(user, id, dto);
  }

  /**
   * Soft-delete: marca `activo=false`. Solo superadmin. NO restaura stock.
   */
  @Delete(':id')
  @Roles('superadmin')
  async softDelete(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.salesService.softDelete(user, id);
  }
}
