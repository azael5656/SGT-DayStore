import { Entity } from 'typeorm';

/**
 * Entidad User - representa un usuario del sistema (dueño o empleado).
 *
 * TODO: Definir las columnas de la tabla:
 *   - id (uuid, PK)
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
  // TODO: implementar columnas con @PrimaryGeneratedColumn, @Column, etc.
}
