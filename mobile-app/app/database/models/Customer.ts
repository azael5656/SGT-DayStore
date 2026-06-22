import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/** Cliente (pull-only). Los registrados sirven offline para ventas a crédito. */
export default class Customer extends Model {
  static table = 'customers';

  @text('cedula') cedula!: string;
  @text('nombre') nombre!: string;
  @text('telefono') telefono?: string;
  @text('email') email?: string;
  @text('notas') notas?: string;
  @field('activo') activo!: boolean;
  @field('server_created_at') serverCreatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number;
}
