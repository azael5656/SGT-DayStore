import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { SaleItem } from './sale-item.entity';
import { SalePayment } from './sale-payment.entity';

/**
 * Estado de una venta.
 *  - `pendiente`: venta a crédito con saldo > 0. El cliente todavía debe.
 *  - `completada`: pagada en totalidad (de contado o ya saldada con abonos).
 *  - `anulada`: revertida (stock devuelto, motivo en `motivoAnulacion`).
 */
export type EstadoVenta = 'pendiente' | 'completada' | 'anulada';

/**
 * Tipo de venta a nivel de negocio.
 *  - `contado`: 1 pago que cubre el total. Cliente opcional (puede ser
 *    anónimo). Estado salta directo a `completada`.
 *  - `credito`: el cliente paga una parte ahora y queda saldo pendiente.
 *    REQUIERE `customerId` (con cédula). Cada abono futuro suma un
 *    `SalePayment` y reduce `saldoUsd`. Cuando llega a 0, pasa a
 *    `completada`.
 */
export type TipoVenta = 'contado' | 'credito';

/**
 * Entidad Sale.
 *
 * Modelo multi-moneda + abonos:
 *  - `total` y `saldoUsd` viven en USD (moneda canónica).
 *  - Para mostrar al cliente en VES o COP, el frontend convierte usando
 *    las tasas vigentes (`GET /exchange-rates/current`).
 *  - Cada abono es un `SalePayment` con tasa congelada del momento.
 *
 * Reglas:
 *  - **No se borra nunca de la BD.** Hay dos mecanismos:
 *    - `cancel`: marca `estado='anulada'` y restaura el stock. Operación
 *      visible para auditoría — la venta sigue listada con el motivo.
 *    - `softDelete`: marca `activo=false` para ocultarla del listado.
 *      Solo superadmin. NO restaura stock.
 *  - Snapshots: `userEmail`, `userNombre` se congelan al crear la venta;
 *    si el usuario cambia de rol o se desactiva, la auditoría histórica
 *    se mantiene.
 *  - El `total` se calcula server-side como suma de `subtotal` de items.
 */
@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Vendedor que creó la venta. FK lógica a `users.id`. */
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** Snapshot del email del vendedor al momento de la venta. */
  @Column({ name: 'user_email', type: 'varchar', length: 180, nullable: true })
  userEmail!: string | null;

  /** Snapshot del nombre del vendedor al momento de la venta. */
  @Column({ name: 'user_nombre', type: 'varchar', length: 120, nullable: true })
  userNombre!: string | null;

  /** Cliente asociado. NULL si es venta de contado anónima. */
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @ManyToOne(() => Customer, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  /** `contado` o `credito`. Define la lógica de saldo y estado. */
  @Column({ name: 'tipo_venta', type: 'varchar', length: 10, default: 'contado' })
  tipoVenta!: TipoVenta;

  /** Total de la venta en USD. */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total!: string;

  /**
   * Saldo pendiente en USD. Para ventas de contado siempre 0. Para
   * crédito: `total - sum(payments.amountUsd)`. Cuando llega a 0,
   * la venta pasa a `completada`.
   */
  @Column({ name: 'saldo_usd', type: 'numeric', precision: 12, scale: 2, default: '0.00' })
  saldoUsd!: string;

  @Column({ type: 'varchar', length: 20, default: 'completada' })
  estado!: EstadoVenta;

  @Column({ name: 'motivo_anulacion', type: 'varchar', length: 300, nullable: true })
  motivoAnulacion!: string | null;

  @Column({ name: 'anulada_por', type: 'uuid', nullable: true })
  anuladaPor!: string | null;

  @Column({ name: 'anulada_en', type: 'timestamptz', nullable: true })
  anuladaEn!: Date | null;

  /** Notas opcionales del vendedor (ej. "se llevó la figura sin caja"). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  notas!: string | null;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  fecha!: Date;

  /** Soft-delete: si es `false`, no aparece en listados por defecto. */
  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => SaleItem, (item) => item.sale, {
    cascade: ['insert'],
    eager: true,
  })
  items!: SaleItem[];

  /**
   * Pagos / abonos de la venta. Para contado: un solo elemento que cubre
   * el total. Para crédito: el primer abono al crear + los abonos
   * registrados después con `POST /sales/:id/abonos`.
   */
  @OneToMany(() => SalePayment, (p) => p.sale, {
    cascade: ['insert'],
    eager: true,
  })
  payments!: SalePayment[];
}
