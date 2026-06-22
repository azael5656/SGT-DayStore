import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, MoreThan } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ExchangeRate } from '../exchange-rates/entities/exchange-rate.entity';
import { Product } from '../products/entities/product.entity';
import { PaymentMethod } from '../sales/entities/sale-payment.entity';
import { SalesService, SyncSaleInput } from '../sales/sales.service';
import { SyncPullDto } from './dto/sync-pull.dto';
import {
  SyncChanges,
  SyncPushDto,
  SyncRecord,
  SyncTableChange,
} from './dto/sync-push.dto';

interface Actor {
  sub: string;
  email?: string;
  role?: 'superadmin' | 'admin' | 'vendedor';
}

const SIN_CAMBIOS: SyncTableChange = { created: [], updated: [], deleted: [] };

/**
 * Sincronización offline-first con la app móvil, alineada al protocolo nativo
 * de WatermelonDB (`synchronize()`).
 *
 *  - **pull**: devuelve lo que cambió desde `lastPulledAt` en las tablas de
 *    solo-lectura del móvil (products, categories, customers, exchange_rates).
 *    Las ventas NO se bajan (son push-only).
 *  - **push**: aplica las ventas creadas offline reusando
 *    `SalesService.createFromSync` (idempotente por el UUID del cliente,
 *    oversell permitido). El servidor recalcula los montos.
 *
 * Los timestamps del cursor son server-side (epoch ms); no se confía en el
 * reloj del móvil para decidir el delta.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sales: SalesService,
  ) {}

  async pull(dto: SyncPullDto) {
    const lastPulledAt = dto.lastPulledAt ?? 0;
    const cursor = new Date(lastPulledAt);
    // Capturado ANTES de las queries: si algo se escribe durante el pull, se
    // re-baja en el próximo (upsert idempotente) en vez de perderse.
    const timestamp = Date.now();

    const [productos, categorias, clientes, tasas] = await Promise.all([
      this.dataSource
        .getRepository(Product)
        .find({ where: { updatedAt: MoreThan(cursor) } }),
      this.dataSource
        .getRepository(Category)
        .find({ where: { updatedAt: MoreThan(cursor) } }),
      this.dataSource
        .getRepository(Customer)
        .find({ where: { updatedAt: MoreThan(cursor) } }),
      // exchange_rates es append-only (no tiene updatedAt): cursor por createdAt.
      this.dataSource
        .getRepository(ExchangeRate)
        .find({ where: { createdAt: MoreThan(cursor) } }),
    ]);

    return {
      changes: {
        categories: this.split(
          categorias,
          lastPulledAt,
          (c) => c.createdAt.getTime(),
          (c) => ({
            id: c.id,
            nombre: c.nombre,
            descripcion: c.descripcion,
            server_created_at: c.createdAt.getTime(),
            server_updated_at: c.updatedAt.getTime(),
          }),
          (c) => !c.activo,
        ),
        products: this.split(
          productos,
          lastPulledAt,
          (p) => p.createdAt.getTime(),
          (p) => ({
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            category_id: p.categoryId,
            precio: Number(p.precio),
            stock: p.stock,
            stock_minimo: p.stockMinimo,
            codigo: p.codigo,
            activo: p.activo,
            server_created_at: p.createdAt.getTime(),
            server_updated_at: p.updatedAt.getTime(),
          }),
          (p) => !p.activo,
        ),
        customers: this.split(
          clientes,
          lastPulledAt,
          (c) => c.createdAt.getTime(),
          (c) => ({
            id: c.id,
            cedula: c.cedula,
            nombre: c.nombre,
            telefono: c.telefono,
            email: c.email,
            notas: c.notas,
            activo: c.activo,
            server_created_at: c.createdAt.getTime(),
            server_updated_at: c.updatedAt.getTime(),
          }),
          (c) => !c.activo,
        ),
        exchange_rates: this.split(
          tasas,
          lastPulledAt,
          (r) => r.createdAt.getTime(),
          (r) => ({
            id: r.id,
            currency: r.currency,
            rate: Number(r.rate),
            effective_from: r.effectiveFrom.getTime(),
            server_created_at: r.createdAt.getTime(),
          }),
        ),
        // Push-only: nada que bajar.
        sales: SIN_CAMBIOS,
        sale_items: SIN_CAMBIOS,
        sale_payments: SIN_CAMBIOS,
      },
      timestamp,
    };
  }

  /**
   * Reparte filas en created/updated/deleted según el protocolo de WatermelonDB:
   *  - soft-deleted (activo=false) → `deleted` (solo el id).
   *  - creadas después del último pull → `created`.
   *  - el resto (existían y se actualizaron) → `updated`.
   * Distinguir created/updated evita el error "update a record that doesn't exist".
   */
  private split<T extends { id: string }>(
    rows: T[],
    lastPulledAt: number,
    createdAtMs: (r: T) => number,
    map: (r: T) => SyncRecord,
    isDeleted?: (r: T) => boolean,
  ): SyncTableChange {
    const created: SyncRecord[] = [];
    const updated: SyncRecord[] = [];
    const deleted: string[] = [];
    for (const r of rows) {
      if (isDeleted?.(r)) {
        deleted.push(r.id);
        continue;
      }
      if (createdAtMs(r) > lastPulledAt) created.push(map(r));
      else updated.push(map(r));
    }
    return { created, updated, deleted };
  }

  async push(actor: Actor, dto: SyncPushDto) {
    const changes: SyncChanges = dto.changes ?? {};
    const ventas = [
      ...(changes.sales?.created ?? []),
      ...(changes.sales?.updated ?? []),
    ];
    const items = [
      ...(changes.sale_items?.created ?? []),
      ...(changes.sale_items?.updated ?? []),
    ];
    const pagos = [
      ...(changes.sale_payments?.created ?? []),
      ...(changes.sale_payments?.updated ?? []),
    ];

    const itemsBySale = this.groupBySaleId(items);
    const pagosBySale = this.groupBySaleId(pagos);

    let aceptadas = 0;
    let rechazadas = 0;
    for (const s of ventas) {
      const id = String(s.id);
      const input: SyncSaleInput = {
        id,
        customerId: (s.customer_id as string | null) ?? null,
        tipoVenta: (s.tipo_venta as SyncSaleInput['tipoVenta']) ?? 'contado',
        fecha: typeof s.fecha === 'number' ? s.fecha : undefined,
        notas: (s.notas as string | null) ?? null,
        items: (itemsBySale[id] ?? []).map((i) => ({
          id: String(i.id),
          productId: String(i.product_id),
          cantidad: Number(i.cantidad),
        })),
        payments: (pagosBySale[id] ?? []).map((p) => ({
          id: String(p.id),
          currency: p.currency as 'USD' | 'VES' | 'COP',
          method: p.method as PaymentMethod,
          amount: Number(p.amount_original),
        })),
      };

      try {
        await this.sales.createFromSync(actor, input);
        aceptadas++;
      } catch (e) {
        // Errores de negocio (producto borrado, combinación inválida, etc.)
        // son permanentes: se descartan y se loguean para no reintentar en
        // bucle. Cualquier otro error (inesperado/sistémico) se propaga para
        // que WatermelonDB conserve la cola y reintente.
        if (
          e instanceof BadRequestException ||
          e instanceof NotFoundException ||
          e instanceof ConflictException
        ) {
          rechazadas++;
          this.logger.error(
            `Venta sync ${id} rechazada (negocio): ${(e as Error).message}`,
          );
        } else {
          throw e;
        }
      }
    }

    // WatermelonDB ignora el cuerpo; con 2xx marca lo enviado como sincronizado.
    return { aceptadas, rechazadas, timestamp: Date.now(), userId: actor.sub };
  }

  private groupBySaleId(rows: SyncRecord[]): Record<string, SyncRecord[]> {
    const out: Record<string, SyncRecord[]> = {};
    for (const r of rows) {
      const sid = String(r.sale_id);
      (out[sid] ??= []).push(r);
    }
    return out;
  }
}
