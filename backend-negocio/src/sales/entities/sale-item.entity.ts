import { Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad SaleItem - cada producto vendido dentro de una venta.
 *
 * Por ahora solo tiene el id para que TypeORM pueda crear la tabla.
 *
 * TODO: Agregar las demas columnas:
 *   - saleId (uuid, FK a sales.id, ManyToOne)
 *   - productId (uuid, FK a products.id)
 *   - cantidad (int, not null)
 *   - precioUnitario (decimal(10,2)) - se guarda copia por historial
 *   - subtotal (decimal(10,2), computed)
 */
@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
