import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/** Producto del inventario (pull-only desde el servidor). */
export default class Product extends Model {
  static table = 'products';

  @text('nombre') nombre!: string;
  @text('descripcion') descripcion?: string;
  @field('category_id') categoryId!: string;
  @field('precio') precio!: number;
  @field('stock') stock!: number;
  @field('stock_minimo') stockMinimo!: number;
  @text('codigo') codigo?: string;
  @field('activo') activo!: boolean;
  @field('server_created_at') serverCreatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number;
}
