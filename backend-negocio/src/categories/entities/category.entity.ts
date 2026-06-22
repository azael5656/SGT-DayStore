import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

/**
 * Entidad Category - agrupa productos (ej. "Manga", "Figura", "Carta",
 * "Camisa", "Joyeria" para un comercio de coleccionables).
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  nombre!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string | null;

  @OneToMany(() => Product, (product) => product.category)
  products!: Product[];

  /**
   * Soft-delete: al "borrar" una categoria solo la marcamos inactiva.
   * La fila nunca se elimina, asi los productos que ya la usan conservan
   * su referencia historica y no rompen la relacion.
   */
  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
