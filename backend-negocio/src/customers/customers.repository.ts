import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

/**
 * Capa de persistencia de clientes. Aísla las queries para que
 * CustomersService solo se ocupe de reglas (cédula única, soft-delete).
 */
@Injectable()
export class CustomersRepository {
  constructor(
    @InjectRepository(Customer) private readonly orm: Repository<Customer>,
  ) {}

  /**
   * Busca por nombre o cédula (ILIKE). Por defecto solo activos. Útil
   * para el selector de cliente en el modal de venta.
   */
  search(query: string, incluirInactivos = false) {
    if (!query) return this.findAll(incluirInactivos);
    const where = incluirInactivos
      ? [{ nombre: ILike(`%${query}%`) }, { cedula: ILike(`%${query}%`) }]
      : [
          { nombre: ILike(`%${query}%`), activo: true },
          { cedula: ILike(`%${query}%`), activo: true },
        ];
    return this.orm.find({ where, take: 30, order: { nombre: 'ASC' } });
  }

  findAll(incluirInactivos = false) {
    return this.orm.find({
      where: incluirInactivos ? {} : { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  findById(id: string) {
    return this.orm.findOne({ where: { id } });
  }

  findByCedula(cedula: string) {
    return this.orm.findOne({ where: { cedula } });
  }

  create(data: Partial<Customer>) {
    const c = this.orm.create(data);
    return this.orm.save(c);
  }

  save(c: Customer) {
    return this.orm.save(c);
  }
}
