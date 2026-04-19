import { Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad Category - agrupa productos (ej. "Bebidas", "Snacks", "Lacteos").
 *
 * Por ahora solo tiene el id para que TypeORM pueda crear la tabla.
 *
 * TODO: Agregar las demas columnas:
 *   - nombre (string, unique, not null)
 *   - descripcion (string, nullable)
 *   - createdAt (timestamp, auto)
 *   - updatedAt (timestamp, auto)
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
