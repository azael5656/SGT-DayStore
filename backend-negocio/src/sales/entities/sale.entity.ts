import { Entity } from 'typeorm';

/**
 * Entidad Sale - representa una venta hecha en la tienda.
 *
 * TODO: Definir las columnas:
 *   - id (uuid, PK)
 *   - userId (uuid, FK a users.id) - quien hizo la venta
 *   - total (decimal(10,2), not null)
 *   - metodoPago (enum 'efectivo' | 'tarjeta' | 'transferencia')
 *   - fecha (timestamp, default now)
 *   - items (OneToMany → SaleItem)
 */
@Entity('sales')
export class Sale {
  // TODO: implementar columnas.
}
