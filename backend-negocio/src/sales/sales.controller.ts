import { Controller } from '@nestjs/common';
import { SalesService } from './sales.service';

/**
 * Controlador de ventas.
 * Endpoints: POST /sales, GET /sales, GET /sales/:id,
 * GET /sales/report/daily, GET /sales/report/monthly
 *
 * TODO: Implementar endpoints de ventas y reportes
 */
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}
}
