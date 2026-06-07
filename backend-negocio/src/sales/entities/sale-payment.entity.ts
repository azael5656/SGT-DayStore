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

/** Métodos de pago soportados. */
export type PaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'pago_movil'
  | 'zelle';

/**
 * Combinaciones moneda/método válidas (matriz de negocio):
 *
 *  - VES: pago_movil, transferencia
 *  - COP: efectivo, transferencia (Bancolombia)
 *  - USD: zelle, efectivo
 */
export const COMBINACIONES_VALIDAS: Record<
  'USD' | 'VES' | 'COP',
  PaymentMethod[]
> = {
  USD: ['zelle', 'efectivo'],
  VES: ['pago_movil', 'transferencia'],
  COP: ['efectivo', 'transferencia'],
};

/**
 * Pago dentro de una venta. Una venta puede tener N pagos (mixto), por
 * ejemplo: $5 en efectivo USD + 600 Bs por pago móvil.
 *
 * Cada pago guarda:
 *  - `currency` y `method`: combinación validada al crear.
 *  - `amountOriginal`: lo que el cliente entregó en su moneda.
 *  - `exchangeRate`: tasa USD → moneda al momento del pago. Para USD = 1.
 *  - `amountUsd`: equivalente en USD = `amountOriginal / exchangeRate`.
 *
 * El `exchangeRate` se congela en cada pago: si la tasa cambia mañana,
 * el reporte histórico de esta venta sigue mostrando lo que fue real.
 */
@Entity('sale_payments')
export class SalePayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => Sale, (sale) => sale.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale!: Sale;

  @Column({ type: 'varchar', length: 3 })
  currency!: 'USD' | 'VES' | 'COP';

  @Column({ type: 'varchar', length: 20 })
  method!: PaymentMethod;

  /** Monto en la moneda del cliente (lo que entregó físicamente). */
  @Column({
    name: 'amount_original',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  amountOriginal!: string;

  /** Tasa congelada al momento. 1 USD = `exchangeRate` `currency`. Para USD = 1. */
  @Column({ name: 'exchange_rate', type: 'numeric', precision: 14, scale: 4 })
  exchangeRate!: string;

  /** Equivalente en USD. Lo calcula el server. */
  @Column({ name: 'amount_usd', type: 'numeric', precision: 14, scale: 2 })
  amountUsd!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
