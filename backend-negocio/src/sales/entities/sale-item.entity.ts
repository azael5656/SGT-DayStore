import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity';

/**
 * Entidad SaleItem — cada línea de una venta (un producto, una cantidad).
 *
 * Snapshots: guarda `productNombre` y `productCodigo` al momento de la
 * venta. Si el producto se renombra o cambia de código después, el
 * historial conserva lo que se vendió realmente.
 *
 * `precioUnitario` se congela también: el server lo toma del producto al
 * momento de la venta, NO del DTO del cliente, para evitar manipulación.
 *
 * `subtotal` = `precioUnitario * cantidad`, calculado server-side.
 */
@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale!: Sale;

  /** FK lógica a `products.id`. No se hace ON DELETE para conservar
   * historial de ventas aunque el producto se desactive más adelante. */
  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  /** Snapshot del nombre del producto al momento de la venta. */
  @Column({ name: 'product_nombre', type: 'varchar', length: 180 })
  productNombre!: string;

  /** Snapshot del código del producto. Útil para tickets/facturas. */
  @Column({ name: 'product_codigo', type: 'varchar', length: 50, nullable: true })
  productCodigo!: string | null;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ name: 'precio_unitario', type: 'numeric', precision: 10, scale: 2 })
  precioUnitario!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
