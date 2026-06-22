import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async create(dto: CreateCategoryDto) {
    // Si ya existe una con ese nombre la reusamos: si estaba borrada
    // (soft-delete) la reactivamos en vez de fallar por el unique de nombre.
    const existente = await this.repo.findByNombre(dto.nombre);
    if (existente) {
      if (existente.activo) {
        throw new ConflictException(
          `Ya existe una categoria llamada "${dto.nombre}"`,
        );
      }
      existente.activo = true;
      existente.descripcion = dto.descripcion ?? existente.descripcion;
      return this.repo.save(existente);
    }
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
    // Soft-delete: la categoria se marca inactiva pero la fila permanece,
    // para no romper los productos que ya la referencian.
    const cat = await this.findOne(id);
    cat.activo = false;
    await this.repo.save(cat);
    return { mensaje: `Categoria ${id} eliminada` };
  }
}
