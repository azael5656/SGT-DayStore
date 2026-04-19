import { Entity } from 'typeorm';

/**
 * Entidad Product - representa un articulo del inventario.
 *
 * TODO: Definir las columnas:
 *   - id (uuid, PK)
 *   - nombre (string, not null)
 *   - descripcion (string, nullable)
 *   - categoryId (uuid, FK a categories.id)
 *   - precio (decimal(10,2), not null)
 *   - stock (int, default 0)
 *   - stockMinimo (int, default 5)
 *   - codigo (string, unique) - codigo de barras
 *   - activo (boolean, default true)
 *   - createdAt (timestamp, auto)
 *   - updatedAt (timestamp, auto)
 */
@Entity('products')
export class Product {
  // TODO: implementar columnas.
}
