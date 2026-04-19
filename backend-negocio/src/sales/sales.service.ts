import { Injectable } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QueryReportDto } from './dto/query-report.dto';

/**
 * Servicio de ventas.
 * Registra ventas con transaccion ACID (descuenta stock atomicamente)
 * y genera reportes agregados.
 *
 * TODO: inyectar DataSource de TypeORM para manejar la transaccion,
 * repositorios de Sale, SaleItem y Product.
 */
@Injectable()
export class SalesService {
  async create(userId: string, dto: CreateSaleDto) {
    // TODO: abrir transaccion, validar stock de cada producto, crear Sale,
    // crear SaleItems, descontar stock, commit. Si algo falla, rollback.
    const total = dto.items.reduce(
      (acc, item) => acc + item.cantidad * item.precioUnitario,
      0,
    );
    return {
      id: 'mock-venta-' + Date.now(),
      userId,
      total,
      metodoPago: dto.metodoPago,
      fecha: new Date().toISOString(),
      items: dto.items,
    };
  }

  async findAll() {
    // TODO: paginar y ordenar por fecha desc.
    return [
      {
        id: 'mock-v1',
        total: 25000,
        metodoPago: 'efectivo',
        fecha: new Date().toISOString(),
      },
    ];
  }

  async findOne(id: string) {
    return {
      id,
      userId: 'mock-user',
      total: 25000,
      metodoPago: 'efectivo',
      fecha: new Date().toISOString(),
      items: [],
    };
  }

  async reportDaily(query: QueryReportDto) {
    // TODO: agregar ventas por dia con SUM(total) GROUP BY DATE(fecha).
    return {
      rango: {
        desde: query.desde || 'hoy',
        hasta: query.hasta || 'hoy',
      },
      ventas: [{ fecha: '2026-04-18', total: 85000, cantidad: 12 }],
    };
  }

  async reportMonthly(query: QueryReportDto) {
    // TODO: agregar por mes.
    return {
      rango: {
        desde: query.desde || 'mes actual',
        hasta: query.hasta || 'mes actual',
      },
      ventas: [{ mes: '2026-04', total: 1_250_000, cantidad: 180 }],
    };
  }
}
