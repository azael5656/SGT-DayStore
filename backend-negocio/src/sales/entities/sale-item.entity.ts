import { Entity } from 'typeorm';

/**
 * Entidad SaleItem - cada producto vendido dentro de una venta.
 *
 * TODO: Definir las columnas:
 *   - id (uuid, PK)
 *   - saleId (uuid, FK a sales.id, ManyToOne)
 *   - productId (uuid, FK a products.id)
 *   - cantidad (int, not null)
 *   - precioUnitario (decimal(10,2)) - se guarda copia por historial
 *   - subtotal (decimal(10,2), computed)
 */
@Entity('sale_items')
export class SaleItem {
  // TODO: implementar columnas.
}
