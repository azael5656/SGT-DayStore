import { Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad Sale - representa una venta hecha en la tienda.
 *
 * Por ahora solo tiene el id para que TypeORM pueda crear la tabla.
 *
 * TODO: Agregar las demas columnas:
 *   - userId (uuid, FK a users.id) - quien hizo la venta
 *   - total (decimal(10,2), not null)
 *   - metodoPago (enum 'efectivo' | 'tarjeta' | 'transferencia')
 *   - fecha (timestamp, default now)
 *   - items (OneToMany → SaleItem)
 */
@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
