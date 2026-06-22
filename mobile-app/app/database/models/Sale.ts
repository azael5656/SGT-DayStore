import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/**
 * Venta (push-only: se crea offline y se sube al sincronizar). El `id` lo
 * genera el móvil → idempotencia en el backend. WatermelonDB marca el record
 * como `created` hasta que el push lo confirma (de ahí sale `pendingCount`).
 */
export default class Sale extends Model {
  static table = 'sales';

  @field('user_id') userId!: string;
  @field('customer_id') customerId?: string;
  @text('tipo_venta') tipoVenta!: string;
  @field('total') total!: number;
  @field('saldo_usd') saldoUsd!: number;
  @text('estado') estado!: string;
  @text('notas') notas?: string;
  @field('fecha') fecha!: number;
  @field('server_created_at') serverCreatedAt?: number;
  @field('server_updated_at') serverUpdatedAt?: number;
}
