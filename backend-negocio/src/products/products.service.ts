import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

/**
 * Servicio de productos.
 * CRUD del inventario mas consultas especiales (stock bajo, stats).
 *
 * Usa TypeORM Repository. La tabla `products` se crea automaticamente con
 * TYPEORM_SYNC=true en dev; en prod van migraciones aparte.
 */
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  async findAll(query: QueryProductsDto) {
    const where: Record<string, unknown> = { activo: true };
    if (query.search) where.nombre = ILike(`%${query.search}%`);
    if (query.categoryId) where.categoryId = query.categoryId;
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findLowStock() {
    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.activo = true')
      .andWhere('p.stock < p.stock_minimo')
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  async getStats() {
    const [totalProductos, totalConStockBajo, rawValor] = await Promise.all([
      this.repo.count({ where: { activo: true } }),
      this.repo
        .createQueryBuilder('p')
        .where('p.activo = true AND p.stock < p.stock_minimo')
        .getCount(),
      this.repo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.precio * p.stock), 0)', 'total')
        .where('p.activo = true')
        .getRawOne<{ total: string }>(),
    ]);
    return {
      totalProductos,
      totalConStockBajo,
      valorInventario: Number(rawValor?.total ?? 0),
    };
  }

  async findOne(id: string) {
    const producto = await this.repo.findOne({ where: { id } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async create(dto: CreateProductDto) {
    const producto = this.repo.create({
      ...dto,
      precio: dto.precio.toString(),
      stockMinimo: dto.stockMinimo ?? 5,
      activo: true,
    });
    return this.repo.save(producto);
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
