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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PdfService } from '../pdf/pdf.service';
import { SalesPdfService } from '../pdf/sales-pdf.service';
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
  constructor(
    private readonly salesService: SalesService,
    private readonly pdf: PdfService,
    private readonly salesPdf: SalesPdfService,
  ) {}

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

  /**
   * Genera un PDF con el historial de ventas segun los filtros recibidos.
   *
   * Respeta el rol del actor: si es vendedor, solo aparecen sus propias
   * ventas (el service reescribe el filtro `userId` para forzar esto).
   *
   * Limita a 200 ventas por reporte — se asume que el usuario filtra por
   * rango de fechas razonable.
   */
  @Get('reports/historial.pdf')
  @Roles('superadmin', 'admin', 'vendedor')
  async historialPdf(
    @CurrentUser() user: JwtUser,
    @Query() query: QuerySalesDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.salesService.findAll(user, {
      ...query,
      page: 1,
      limit: 200,
    });
    const docDef = this.salesPdf.historialDocDef(
      data.items,
      {
        desde: query.desde ? new Date(query.desde) : undefined,
        hasta: query.hasta ? new Date(query.hasta) : undefined,
        estado: query.estado,
        tipoVenta: query.tipoVenta,
        incluirAnuladas: query.incluirAnuladas === 'true',
      },
      { email: user.email, role: user.role },
    );
    const buffer = await this.pdf.generate(docDef);
    const filename = PdfService.makeFilename('historial-ventas');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
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
   * Genera el comprobante PDF (no fiscal) de una venta individual.
   * Items, pagos, saldo y notas. Util para entregar al cliente.
   *
   * Respeta el mismo control de acceso que `findOne`: un vendedor solo
   * puede sacar comprobantes de las ventas que el mismo creo.
   */
  @Get(':id/comprobante.pdf')
  @Roles('superadmin', 'admin', 'vendedor')
  async comprobantePdf(
    @CurrentUser() user: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const venta = await this.salesService.findOne(user, id);
    const docDef = this.salesPdf.comprobanteDocDef(venta);
    const buffer = await this.pdf.generate(docDef);
    const filename = PdfService.makeFilename(
      `comprobante-${id.slice(0, 8)}`,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
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
