import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, User } from '../auth/entities/user.entity';

/**
 * Capa de persistencia de usuarios. Aísla las queries a la tabla `users`
 * para que UsersService solo se ocupe de reglas de negocio (un único
 * superadmin/admin activo, hashes de password, etc.).
 */
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly orm: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.orm.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.orm.findOne({ where: { id } });
  }

  findAllOrderedByCreated() {
    return this.orm.find({ order: { createdAt: 'DESC' } });
  }

  countActiveByRole(role: Role) {
    return this.orm.count({ where: { role, activo: true } });
  }

  create(data: Partial<User>) {
    const u = this.orm.create(data);
    return this.orm.save(u);
  }

  save(u: User) {
    return this.orm.save(u);
  }

  deleteById(id: string) {
    return this.orm.delete({ id });
  }
}
