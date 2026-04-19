import { Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad AuditLog - registra cada operacion de escritura hecha en el sistema.
 *
 * Por ahora solo tiene el id para que TypeORM pueda crear la tabla.
 *
 * TODO: Agregar las demas columnas:
 *   - userId (uuid, nullable) - puede ser null si la accion fue anonima
 *   - userEmail (string) - se guarda copia por si el usuario se elimina
 *   - metodo (string) - POST, PUT, DELETE
 *   - ruta (string) - ej. "/products"
 *   - payload (jsonb, nullable) - body de la peticion (sin passwords)
 *   - ip (string)
 *   - userAgent (string)
 *   - fecha (timestamp, default now)
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
}
