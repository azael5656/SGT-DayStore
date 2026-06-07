import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Monedas soportadas por la tienda. USD es la moneda canónica del sistema:
 * todos los precios en BD se almacenan en USD y las demás se calculan
 * dinámicamente con la tasa vigente al momento.
 */
export type Currency = 'USD' | 'VES' | 'COP';

/**
 * Tasa de cambio configurada por el admin. Cada vez que el dueño abre la
 * tienda, sube la tasa del día (ej. 1 USD = 620 Bs). El sistema toma la
 * última `effectiveFrom` ≤ ahora como la vigente.
 *
 * Las tasas pasadas se conservan para que reportes históricos respeten
 * la tasa que estaba activa al momento de cada venta.
 *
 * USD no se almacena (rate=1 implícito). Solo VES y COP.
 */
@Entity('exchange_rates')
@Index(['currency', 'effectiveFrom'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Moneda destino. USD nunca se guarda (es la base). */
  @Column({ type: 'varchar', length: 3 })
  currency!: 'VES' | 'COP';

  /**
   * Cuántas unidades de `currency` equivalen a 1 USD.
   * Ej: rate=620 significa 1 USD = 620 VES.
   */
  @Column({ type: 'numeric', precision: 14, scale: 4 })
  rate!: string;

  /**
   * Desde cuándo está vigente esta tasa. Default: ahora. Permite subir
   * tasas con efecto futuro si se quiere.
   */
  @Column({
    name: 'effective_from',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  effectiveFrom!: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'created_by_email', type: 'varchar', length: 180, nullable: true })
  createdByEmail!: string | null;

  /** Notas opcionales del admin (ej. "tasa BCV", "tasa paralelo"). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  notas!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
