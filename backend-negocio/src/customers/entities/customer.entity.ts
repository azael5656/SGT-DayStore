import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Cliente / deudor de la tienda.
 *
 * Solo se registra cuando aplica — para control de ventas a crédito y
 * seguimiento de saldos pendientes. Las ventas de contado anónimas no
 * crean cliente.
 *
 * La cédula es la clave natural (única) — en Venezuela y Colombia es la
 * forma estándar de identificar a una persona. El nombre se guarda
 * obligatorio para que en los reportes de "deudores" se vea quién debe
 * sin tener que cruzar tablas.
 */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Cédula de identidad. Única, obligatoria. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  cedula!: string;

  @Column({ type: 'varchar', length: 180 })
  nombre!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email!: string | null;

  /** Notas libres del dueño (ej. "amigo de la familia, paga puntual"). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  notas!: string | null;

  /** Soft-delete. Si es false no aparece en listados ni se puede usar
   *  para nuevas ventas, pero las ventas históricas lo conservan. */
  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
