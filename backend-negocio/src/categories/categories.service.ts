import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Servicio de categorias.
 * CRUD basico sobre la tabla "categories".
 *
 * TODO: inyectar el repositorio de Category con @InjectRepository(Category)
 * y reemplazar los mocks con operaciones reales de TypeORM.
 */
@Injectable()
export class CategoriesService {
  async findAll() {
    // TODO: return this.categoryRepo.find();
    return [
      { id: 'mock-1', nombre: 'Bebidas', descripcion: 'Refrescos y jugos' },
      { id: 'mock-2', nombre: 'Snacks', descripcion: 'Papitas y galletas' },
    ];
  }

  async findOne(id: string) {
    // TODO: return this.categoryRepo.findOneBy({ id });
    return { id, nombre: 'Bebidas', descripcion: 'Refrescos y jugos' };
  }

  async create(dto: CreateCategoryDto) {
    // TODO: persistir en BD y devolver la entidad guardada.
    return {
      id: 'mock-' + Date.now(),
      nombre: dto.nombre,
      descripcion: dto.descripcion || null,
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    // TODO: actualizar en BD con this.categoryRepo.update(id, dto).
    return {
      id,
      nombre: dto.nombre || 'Bebidas',
      descripcion: dto.descripcion || null,
    };
  }

  async remove(id: string) {
    // TODO: eliminar con this.categoryRepo.delete(id).
    return { mensaje: `Categoria ${id} eliminada` };
  }
}
