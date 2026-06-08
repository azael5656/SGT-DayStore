import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Repository } from 'typeorm';
import { Product } from './entities/product.entity';

interface FindAllFilter {
  search?: string;
  categoryId?: string;
}

/**
 * Capa de persistencia de productos. Encapsula tanto los `find` simples
 * como las queries con QueryBuilder (stock bajo, stats agregadas).
 *
 * Los métodos que reciben un `EntityManager` están pensados para usarse
 * dentro de transacciones (ej. al registrar una venta): el manager viene
 * del `runInTransaction` y comparte la misma sesión SQL que el resto de
 * operaciones, garantizando atomicidad y locking correcto.
 */
@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product) private readonly orm: Repository<Product>,
  ) {}

  findActive(filter: FindAllFilter) {
    const base: Record<string, unknown> = { activo: true };
    if (filter.categoryId) base.categoryId = filter.categoryId;
    // Busca por nombre O por codigo (parcial, sin distinguir mayusculas):
    // asi "JOY" encuentra "JOY-VEG-E" igual que coincidiria con un nombre.
    const where = filter.search
      ? [
          { ...base, nombre: ILike(`%${filter.search}%`) },
          { ...base, codigo: ILike(`%${filter.search}%`) },
        ]
      : base;
    return this.orm.find({ where, order: { createdAt: 'DESC' } });
  }

  findById(id: string) {
    return this.orm.findOne({ where: { id } });
  }

  /** Productos cuyo stock cayó por debajo del mínimo configurado. */
  findLowStock() {
    return this.orm
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.activo = true')
      .andWhere('p.stock < p.stock_minimo')
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  countActive() {
    return this.orm.count({ where: { activo: true } });
  }

  countLowStock() {
    return this.orm
      .createQueryBuilder('p')
      .where('p.activo = true AND p.stock < p.stock_minimo')
      .getCount();
  }

  /** Suma del valor de inventario activo (precio * stock). */
  async sumInventoryValue(): Promise<number> {
    const raw = await this.orm
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.precio * p.stock), 0)', 'total')
      .where('p.activo = true')
      .getRawOne<{ total: string }>();
    return Number(raw?.total ?? 0);
  }

  create(data: Partial<Product>) {
    const p = this.orm.create(data);
    return this.orm.save(p);
  }

  save(p: Product) {
    return this.orm.save(p);
  }

  // ---------------------------------------------------------------------------
  // Métodos transaccionales — los usa SalesService al crear/anular ventas.
  // ---------------------------------------------------------------------------

  /**
   * Carga un producto **bloqueando la fila** (PostgreSQL `SELECT ... FOR
   * UPDATE`). Lo usa SalesService al validar stock dentro de una
   * transacción: garantiza que dos ventas concurrentes del mismo producto
   * no ambas pasen la validación con el mismo stock disponible.
   *
   * Solo tiene sentido llamarlo dentro de un `runInTransaction`.
   */
  findByIdLocked(manager: EntityManager, id: string) {
    return manager
      .getRepository(Product)
      .createQueryBuilder('p')
      .setLock('pessimistic_write')
      .where('p.id = :id', { id })
      .getOne();
  }

  /**
   * Decrementa el stock de un producto en `cantidad` unidades, dentro de
   * una transacción. Lo usa SalesService al confirmar una venta.
   *
   * Asume que `findByIdLocked` ya validó que hay stock suficiente. Si la
   * resta deja stock < 0, la BD lo permite — la validación es
   * responsabilidad del service.
   */
  async decrementStock(manager: EntityManager, productId: string, cantidad: number) {
    await manager
      .getRepository(Product)
      .createQueryBuilder()
      .update()
      .set({ stock: () => `stock - ${cantidad}` })
      .where('id = :id', { id: productId })
      .execute();
  }

  /**
   * Incrementa el stock de un producto. Lo usa SalesService al anular una
   * venta para devolver el inventario a su estado anterior.
   */
  async incrementStock(manager: EntityManager, productId: string, cantidad: number) {
    await manager
      .getRepository(Product)
      .createQueryBuilder()
      .update()
      .set({ stock: () => `stock + ${cantidad}` })
      .where('id = :id', { id: productId })
      .execute();
  }
}
