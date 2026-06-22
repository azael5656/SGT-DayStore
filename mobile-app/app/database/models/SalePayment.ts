import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/** Pago/abono de una venta (push-only). */
export default class SalePayment extends Model {
  static table = 'sale_payments';

  @field('sale_id') saleId!: string;
  @text('currency') currency!: string;
  @text('method') method!: string;
  @field('amount_original') amountOriginal!: number;
  @field('exchange_rate') exchangeRate!: number;
  @field('amount_usd') amountUsd!: number;
}
