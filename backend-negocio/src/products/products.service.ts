import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './products.repository';

/**
 * Servicio de productos. Lógica de negocio del CRUD de inventario.
 * Toda la persistencia va a través de ProductsRepository.
 */
@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  findAll(query: QueryProductsDto) {
    return this.repo.findActive({
      search: query.search,
      categoryId: query.categoryId,
    });
  }

  findLowStock() {
    return this.repo.findLowStock();
  }

  async getStats() {
    const [totalProductos, totalConStockBajo, valorInventario] = await Promise.all([
      this.repo.countActive(),
      this.repo.countLowStock(),
      this.repo.sumInventoryValue(),
    ]);
    return { totalProductos, totalConStockBajo, valorInventario };
  }

  async findOne(id: string) {
    const producto = await this.repo.findById(id);
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  create(dto: CreateProductDto) {
    return this.repo.create({
      ...dto,
      precio: dto.precio.toString(),
      stockMinimo: dto.stockMinimo ?? 5,
      activo: true,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const producto = await this.findOne(id);
    Object.assign(producto, {
      ...dto,
      precio: dto.precio !== undefined ? dto.precio.toString() : producto.precio,
    });
    return this.repo.save(producto);
  }

  async remove(id: string) {
    const producto = await this.findOne(id);
    producto.activo = false;
    await this.repo.save(producto);
    return { mensaje: `Producto ${id} eliminado` };
  }
}
