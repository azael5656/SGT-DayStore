import { Controller } from '@nestjs/common';
import { CategoriesService } from './categories.service';

/**
 * Controlador de categorias.
 * Endpoints: GET /categories, GET /categories/:id, POST /categories,
 * PUT /categories/:id, DELETE /categories/:id
 *
 * TODO: Implementar endpoints CRUD
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
}
