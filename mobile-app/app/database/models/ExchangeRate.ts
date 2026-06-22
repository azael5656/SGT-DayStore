import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/** Tasa de cambio (pull-only). Offline se usa la última pulleada para convertir. */
export default class ExchangeRate extends Model {
  static table = 'exchange_rates';

  @text('currency') currency!: string;
  @field('rate') rate!: number;
  @field('effective_from') effectiveFrom!: number;
  @field('server_created_at') serverCreatedAt!: number;
}
