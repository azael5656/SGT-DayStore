import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

/**
 * Capa de persistencia de categorías. Aísla las queries TypeORM del
 * service. Si en el futuro cambiamos de ORM o agregamos caché, este es
 * el único punto que se toca.
 */
@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category) private readonly orm: Repository<Category>,
  ) {}

  /** Solo categorias activas (las soft-deleted quedan ocultas). */
  findAllOrderedByName() {
    return this.orm.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  findById(id: string) {
    return this.orm.findOne({ where: { id } });
  }

  /** Busca por nombre exacto (activa o no) para reactivar al recrear. */
  findByNombre(nombre: string) {
    return this.orm.findOne({ where: { nombre } });
  }

  create(data: Pick<Category, 'nombre' | 'descripcion'>) {
    const cat = this.orm.create(data);
    return this.orm.save(cat);
  }

  save(cat: Category) {
    return this.orm.save(cat);
  }
}
