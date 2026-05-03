import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Servicio de categorías. Orquesta la lógica de negocio y delega la
 * persistencia a CategoriesRepository — nunca toca TypeORM directo.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  findAll() {
    return this.repo.findAllOrderedByName();
  }

  async findOne(id: string) {
    const cat = await this.repo.findById(id);
    if (!cat) throw new NotFoundException('Categoria no encontrada');
    return cat;
  }

  create(dto: CreateCategoryDto) {
    return this.repo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const cat = await this.findOne(id);
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: string) {
    const cat = await this.findOne(id);
    await this.repo.remove(cat);
    return { mensaje: `Categoria ${id} eliminada` };
  }
}
