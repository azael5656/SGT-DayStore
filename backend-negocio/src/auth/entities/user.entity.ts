import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type Role = 'superadmin' | 'admin' | 'vendedor';

/**
 * Usuario del sistema. Tres roles:
 *  - superadmin: dev/soporte. Ve todo, gestiona usuarios y cambia roles.
 *  - admin: dueno de la tienda. Dashboard, auditoria, CRUD inventario,
 *    crear vendedores.
 *  - vendedor: operacion diaria. Inventario (lectura), ventas, alertas.
 *
 * El passwordHash se calcula con bcryptjs (10 rounds) en UsersService.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 180 })
  email!: string;

  @Column({ length: 200 })
  passwordHash!: string;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ type: 'varchar', length: 20, default: 'vendedor' })
  role!: Role;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
