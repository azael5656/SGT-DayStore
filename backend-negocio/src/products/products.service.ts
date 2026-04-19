import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * Servicio de productos.
 * CRUD del inventario mas consultas especiales (stock bajo, stats).
 *
 * TODO: inyectar @InjectRepository(Product) y reemplazar los mocks.
 */
@Injectable()
export class ProductsService {
  async findAll(query: QueryProductsDto) {
    // TODO: construir query con QueryBuilder y filtrar por search/categoryId.
    return [
      {
        id: 'mock-p1',
        nombre: 'Coca Cola 600ml',
        precio: 3500,
        stock: 24,
        categoryId: 'mock-c1',
        coincideCon: query.search || null,
      },
    ];
  }

  async findLowStock() {
    // TODO: return this.productRepo.find({ where: { stock: LessThan(stockMinimo) } });
    return [
      {
        id: 'mock-p2',
        nombre: 'Papitas Margarita',
        stock: 2,
        stockMinimo: 5,
      },
    ];
  }

  async getStats() {
    // TODO: calcular totales con query aggregada.
    return {
      totalProductos: 120,
      totalConStockBajo: 8,
      valorInventario: 4_500_000,
    };
  }

  async findOne(id: string) {
    // TODO: return this.productRepo.findOneBy({ id });
    return {
      id,
      nombre: 'Coca Cola 600ml',
      precio: 3500,
      stock: 24,
      categoryId: 'mock-c1',
    };
  }

  async create(dto: CreateProductDto) {
    // TODO: persistir en BD.
    return {
      id: 'mock-' + Date.now(),
      ...dto,
      stockMinimo: dto.stockMinimo || 5,
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    // TODO: actualizar en BD.
    return { id, ...dto };
  }

  async remove(id: string) {
    // TODO: soft-delete marcando activo = false.
    return { mensaje: `Producto ${id} eliminado` };
  }
}
