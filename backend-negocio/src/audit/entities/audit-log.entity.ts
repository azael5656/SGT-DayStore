import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Registro de cada operacion auditada (login, escrituras, ack de alerta,
 * ejecucion de escenarios IoT). Almacenado en Postgres.
 */
@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['resource', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  userEmail!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  userRole!: string | null;

  @Column({ type: 'varchar', length: 60 })
  action!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  resource!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  resourceId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
