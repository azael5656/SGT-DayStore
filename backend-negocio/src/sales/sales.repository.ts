import { Injectable } from '@nestjs/common';
import { Between, DataSource, EntityManager, FindOptionsWhere, In } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';

interface ListFilter {
  desde?: Date;
  hasta?: Date;
  userId?: string;
  customerId?: string;
  tipoVenta?: 'contado' | 'credito';
  estado?: 'pendiente' | 'completada' | 'anulada';
  incluirAnuladas: boolean;
  incluirInactivas: boolean;
  page: number;
  limit: number;
}

/**
 * Capa de persistencia de ventas. Centraliza:
 *  - Apertura de transacciones ACID (`runInTransaction`).
 *  - CRUD básico sobre Sale / SaleItem.
 *  - Reportes agregados (`reportDaily`, `reportMonthly`).
 *
 * El service (`SalesService`) NUNCA toca TypeORM directo — todo pasa por
 * aquí para que la lógica de negocio sea testeable sin ORM.
 */
@Injectable()
export class SalesRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Ejecuta `work` dentro de una transacción. Si la callback lanza,
   * TypeORM hace ROLLBACK automático.
   */
  runInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }

  /**
   * Crea una venta con sus items y pagos dentro de una transacción.
   * Todos los datos ya vienen calculados server-side (precios congelados,
   * tasas congeladas, equivalentes en USD).
   */
  async createWithItemsAndPayments(
    manager: EntityManager,
    saleData: Partial<Sale>,
    items: Partial<SaleItem>[],
    payments: Partial<SalePayment>[],
  ): Promise<Sale> {
    const sale = manager.getRepository(Sale).create({
      ...saleData,
      items: items.map((i) => manager.getRepository(SaleItem).create(i)),
      payments: payments.map((p) =>
        manager.getRepository(SalePayment).create(p),
      ),
    });
    return manager.getRepository(Sale).save(sale);
  }

  /**
   * Carga una venta por id con sus items y pagos. Devuelve `null` si no
   * existe.
   *
   * @param incluirInactivas Si es `true`, también devuelve ventas con
   *   `activo=false`. Útil para superadmin viendo histórico completo.
   */
  async findById(id: string, incluirInactivas = false): Promise<Sale | null> {
    const where: FindOptionsWhere<Sale> = { id };
    if (!incluirInactivas) where.activo = true;
    return this.dataSource.getRepository(Sale).findOne({
      where,
      relations: ['items', 'payments', 'customer'],
    });
  }

  /**
   * Mismo `findById` pero dentro de una transacción y bloqueando la fila.
   *
   * Nota: Postgres no permite `FOR UPDATE` sobre el lado nullable de un
   * `LEFT JOIN` — por eso bloqueamos solo la tabla `sales` (`FOR UPDATE
   * OF s`) y cargamos items y payments en queries separadas.
   */
  async findByIdLocked(manager: EntityManager, id: string): Promise<Sale | null> {
    const venta = await manager
      .getRepository(Sale)
      .createQueryBuilder('s')
      .setLock('pessimistic_write', undefined, ['s'])
      .where('s.id = :id', { id })
      .getOne();
    if (!venta) return null;
    const [items, payments, customer] = await Promise.all([
      manager.getRepository(SaleItem).find({ where: { saleId: id } }),
      manager.getRepository(SalePayment).find({ where: { saleId: id } }),
      venta.customerId
        ? manager.getRepository(Customer).findOne({ where: { id: venta.customerId } })
        : Promise.resolve(null),
    ]);
    venta.items = items;
    venta.payments = payments;
    venta.customer = customer;
    return venta;
  }

  /** Crea un SalePayment dentro de una transacción (para abonos). */
  createPaymentInTransaction(manager: EntityManager, data: Partial<SalePayment>) {
    const p = manager.getRepository(SalePayment).create(data);
    return manager.getRepository(SalePayment).save(p);
  }

  /**
   * Actualiza solo el header de una venta (saldo, estado, etc.) sin
   * tocar las relaciones cargadas. Lo usa `registerAbono` después de
   * insertar el SalePayment — usar `save()` con cascade reescribiría
   * los payments y perdería el saleId del nuevo.
   */
  updateSaleHeader(
    manager: EntityManager,
    id: string,
    patch: Partial<Sale>,
  ) {
    return manager.getRepository(Sale).update({ id }, patch);
  }

  /**
   * Lista ventas paginadas con filtros. Por defecto:
   *  - Solo `activo=true`.
   *  - Excluye `estado='anulada'` (se incluyen con `incluirAnuladas=true`).
   *  - Devuelve pendientes y completadas; las pendientes son las ventas
   *    a credito con saldo vivo y antes quedaban ocultas en el filtro
   *    "Todas" del frontend.
   *
   * Devuelve `{ items, total, page, limit }`.
   */
  async findAllPaginated(filter: ListFilter) {
    const qb = this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'i')
      .leftJoinAndSelect('s.payments', 'p')
      .leftJoinAndSelect('s.customer', 'c')
      .orderBy('s.fecha', 'DESC');

    if (!filter.incluirInactivas) qb.andWhere('s.activo = true');

    if (filter.estado) {
      qb.andWhere('s.estado = :estado', { estado: filter.estado });
    } else if (!filter.incluirAnuladas) {
      qb.andWhere(`s.estado != 'anulada'`);
    }

    if (filter.userId) qb.andWhere('s.user_id = :userId', { userId: filter.userId });
    if (filter.customerId) qb.andWhere('s.customer_id = :cid', { cid: filter.customerId });
    if (filter.tipoVenta) qb.andWhere('s.tipo_venta = :tv', { tv: filter.tipoVenta });

    if (filter.desde && filter.hasta) {
      qb.andWhere({ fecha: Between(filter.desde, filter.hasta) });
    } else if (filter.desde) {
      qb.andWhere('s.fecha >= :desde', { desde: filter.desde });
    } else if (filter.hasta) {
      qb.andWhere('s.fecha <= :hasta', { hasta: filter.hasta });
    }

    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: filter.page, limit: filter.limit };
  }

  /** Guarda los cambios en la entidad Sale dentro de una transacción. */
  saveInTransaction(manager: EntityManager, sale: Sale) {
    return manager.getRepository(Sale).save(sale);
  }

  // ---------------------------------------------------------------------------
  // Reportes agregados.
  // ---------------------------------------------------------------------------

  /**
   * Suma de ventas y conteo agrupado por día, en un rango. Solo
   * considera ventas `completada` y `activo=true`.
   */
  async reportDaily(desde: Date, hasta: Date) {
    const rows = await this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('s')
      .select(`TO_CHAR(s.fecha, 'YYYY-MM-DD')`, 'fecha')
      .addSelect('COALESCE(SUM(s.total), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('s.activo = true')
      .andWhere(`s.estado = 'completada'`)
      .andWhere('s.fecha BETWEEN :d AND :h', { d: desde, h: hasta })
      .groupBy(`TO_CHAR(s.fecha, 'YYYY-MM-DD')`)
      .orderBy(`TO_CHAR(s.fecha, 'YYYY-MM-DD')`, 'ASC')
      .getRawMany<{ fecha: string; total: string; cantidad: string }>();

    return rows.map((r) => ({
      fecha: r.fecha,
      total: Number(r.total),
      cantidad: Number(r.cantidad),
    }));
  }

  /**
   * KPI: Total y cantidad de ventas en un rango.
   * Solo cuenta ventas completadas y activas.
   */
  async sumarVentasEnRango(desde: Date, hasta: Date) {
    const raw = await this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.total), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('s.activo = true')
      .andWhere(`s.estado = 'completada'`)
      .andWhere('s.fecha BETWEEN :d AND :h', { d: desde, h: hasta })
      .getRawOne<{ total: string; cantidad: string }>();
    return {
      totalUsd: Number(raw?.total ?? 0),
      cantidad: Number(raw?.cantidad ?? 0),
    };
  }

  /**
   * Top productos vendidos en un rango (por cantidad). Devuelve los 5 más
   * vendidos con su nombre snapshot, unidades vendidas y total USD.
   */
  async topProductos(desde: Date, hasta: Date, limite = 5) {
    return this.dataSource
      .getRepository(SaleItem)
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .select('si.product_id', 'productId')
      .addSelect('si.product_nombre', 'nombre')
      .addSelect('SUM(si.cantidad)', 'unidades')
      .addSelect('SUM(si.subtotal)', 'totalUsd')
      .where('s.activo = true')
      .andWhere(`s.estado = 'completada'`)
      .andWhere('s.fecha BETWEEN :d AND :h', { d: desde, h: hasta })
      .groupBy('si.product_id')
      .addGroupBy('si.product_nombre')
      .orderBy('SUM(si.cantidad)', 'DESC')
      .limit(limite)
      .getRawMany<{
        productId: string;
        nombre: string;
        unidades: string;
        totalUsd: string;
      }>();
  }

  /**
   * Distribución de pagos por moneda y por método en un rango.
   * Útil para ver qué tipo de pago usa más la gente.
   */
  async distribucionPagos(desde: Date, hasta: Date) {
    const [porMoneda, porMetodo] = await Promise.all([
      this.dataSource
        .getRepository(SalePayment)
        .createQueryBuilder('p')
        .innerJoin('p.sale', 's')
        .select('p.currency', 'currency')
        .addSelect('SUM(p.amount_usd)', 'totalUsd')
        .addSelect('COUNT(*)', 'cantidad')
        .where('s.activo = true')
        .andWhere(`s.estado = 'completada'`)
        .andWhere('s.fecha BETWEEN :d AND :h', { d: desde, h: hasta })
        .groupBy('p.currency')
        .getRawMany<{ currency: string; totalUsd: string; cantidad: string }>(),
      this.dataSource
        .getRepository(SalePayment)
        .createQueryBuilder('p')
        .innerJoin('p.sale', 's')
        .select('p.method', 'method')
        .addSelect('SUM(p.amount_usd)', 'totalUsd')
        .addSelect('COUNT(*)', 'cantidad')
        .where('s.activo = true')
        .andWhere(`s.estado = 'completada'`)
        .andWhere('s.fecha BETWEEN :d AND :h', { d: desde, h: hasta })
        .groupBy('p.method')
        .getRawMany<{ method: string; totalUsd: string; cantidad: string }>(),
    ]);
    return { porMoneda, porMetodo };
  }

  /**
   * Lista las ventas activas con saldo pendiente de un cliente especifico.
   * La usa CustomersService al desactivar un cliente para detectar deudas
   * vivas y decidir si anular o pedir confirmacion al usuario.
   *
   * Si recibe `manager`, corre dentro de una transaccion (usado para que
   * la lectura sea consistente con las anulaciones que vienen despues).
   */
  async findPendingByCustomer(
    customerId: string,
    manager?: EntityManager,
  ): Promise<Sale[]> {
    const repo = manager
      ? manager.getRepository(Sale)
      : this.dataSource.getRepository(Sale);
    return repo.find({
      where: { customerId, estado: 'pendiente', activo: true },
      order: { fecha: 'ASC' },
    });
  }

  /**
   * Marca varias ventas como anuladas dentro de una transaccion.
   * Pone `saldoUsd=0` para que dejen de contar como deuda viva en
   * cualquier reporte agregado. Usado al desactivar un cliente con
   * deudas pendientes (`cancelDebts=true`).
   */
  async cancelSalesInTransaction(
    manager: EntityManager,
    saleIds: string[],
  ): Promise<void> {
    if (saleIds.length === 0) return;
    await manager.getRepository(Sale).update(
      { id: In(saleIds) },
      { estado: 'anulada', saldoUsd: '0.00' },
    );
  }

  /**
   * Resumen de deudas: cuántas ventas pendientes hay y la suma de saldos.
   */
  async resumenDeudas() {
    const raw = await this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('s')
      .select('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(s.saldo_usd), 0)', 'totalSaldoUsd')
      .where('s.activo = true')
      .andWhere(`s.estado = 'pendiente'`)
      .getRawOne<{ cantidad: string; totalSaldoUsd: string }>();
    return {
      cantidad: Number(raw?.cantidad ?? 0),
      totalSaldoUsd: Number(raw?.totalSaldoUsd ?? 0),
    };
  }

  /** Misma idea pero agrupado por mes (`YYYY-MM`). */
  async reportMonthly(desde: Date, hasta: Date) {
    const rows = await this.dataSource
      .getRepository(Sale)
      .createQueryBuilder('s')
      .select(`TO_CHAR(s.fecha, 'YYYY-MM')`, 'mes')
      .addSelect('COALESCE(SUM(s.total), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('s.activo = true')
      .andWhere(`s.estado = 'completada'`)
      .andWhere('s.fecha BETWEEN :d AND :h', { d: desde, h: hasta })
      .groupBy(`TO_CHAR(s.fecha, 'YYYY-MM')`)
      .orderBy(`TO_CHAR(s.fecha, 'YYYY-MM')`, 'ASC')
      .getRawMany<{ mes: string; total: string; cantidad: string }>();

    return rows.map((r) => ({
      mes: r.mes,
      total: Number(r.total),
      cantidad: Number(r.cantidad),
    }));
  }
}
