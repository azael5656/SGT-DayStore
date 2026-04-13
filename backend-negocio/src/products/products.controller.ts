import { Controller } from '@nestjs/common';
import { ProductsService } from './products.service';

/**
 * Controlador de productos.
 * Endpoints: GET /products, GET /products/:id, POST /products,
 * PUT /products/:id, DELETE /products/:id,
 * GET /products/low-stock, GET /products/stats
 *
 * TODO: Implementar endpoints CRUD y consultas especiales
 */
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
}
