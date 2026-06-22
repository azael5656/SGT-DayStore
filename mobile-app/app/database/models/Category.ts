import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/** Categoría (pull-only desde el servidor). */
export default class Category extends Model {
  static table = 'categories';

  @text('nombre') nombre!: string;
  @text('descripcion') descripcion?: string;
  @field('server_created_at') serverCreatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number;
}
