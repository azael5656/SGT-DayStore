import { Entity } from 'typeorm';

/**
 * Entidad Category - agrupa productos (ej. "Bebidas", "Snacks", "Lacteos").
 *
 * TODO: Definir las columnas de la tabla:
 *   - id (uuid, PK)
 *   - nombre (string, unique, not null)
 *   - descripcion (string, nullable)
 *   - createdAt (timestamp, auto)
 *   - updatedAt (timestamp, auto)
 */
@Entity('categories')
export class Category {
  // TODO: implementar columnas.
}
