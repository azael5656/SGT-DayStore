import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/** Línea de una venta (push-only). El backend re-congela precio al sincronizar. */
export default class SaleItem extends Model {
  static table = 'sale_items';

  @field('sale_id') saleId!: string;
  @field('product_id') productId!: string;
  @text('product_nombre') productNombre!: string;
  @field('cantidad') cantidad!: number;
  @field('precio_unitario') precioUnitario!: number;
  @field('subtotal') subtotal!: number;
}
