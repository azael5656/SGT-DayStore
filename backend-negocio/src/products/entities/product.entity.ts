import { Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad Product - representa un articulo del inventario.
 *
 * Por ahora solo tiene el id para que TypeORM pueda crear la tabla.
 *
 * TODO: Agregar las demas columnas:
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
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
