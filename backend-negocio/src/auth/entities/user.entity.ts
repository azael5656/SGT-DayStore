import { Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad User - representa un usuario del sistema (dueño o empleado).
 *
 * Por ahora solo tiene el id para que TypeORM pueda crear la tabla.
 *
 * TODO: Agregar las demas columnas:
 *   - email (string, unique, not null)
 *   - passwordHash (string, not null)
 *   - nombre (string, not null)
 *   - role (enum 'owner' | 'employee', default 'employee')
 *   - activo (boolean, default true)
 *   - createdAt (timestamp, auto)
 *   - updatedAt (timestamp, auto)
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
