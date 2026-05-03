import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role, User } from '../auth/entities/user.entity';
import { UsersRepository } from './users.repository';

const BCRYPT_ROUNDS = 10;

interface CreateUserInput {
  email: string;
  password: string;
  nombre: string;
  role: Role;
}

/**
 * Servicio de usuarios. Reglas de negocio (un único superadmin/admin
 * activo, hashing de password, etc.) viven aquí. La persistencia se
 * delega a UsersRepository.
 */
@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findByEmail(email);
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  findAll(): Promise<User[]> {
    return this.repo.findAllOrderedByCreated();
  }

  contarActivosPorRol(role: Role): Promise<number> {
    return this.repo.countActiveByRole(role);
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const previa = await this.repo.findByEmail(email);
    if (previa) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    return this.repo.create({
      email,
      passwordHash,
      nombre: input.nombre,
      role: input.role,
      activo: true,
    });
  }

  /**
   * Crea o actualiza por email. Idempotente — útil para el script de
   * bootstrap admin:create cuando se reusa el mismo email.
   */
  async upsertByEmail(input: CreateUserInput): Promise<User> {
    const existente = await this.repo.findByEmail(input.email);
    if (existente) {
      existente.nombre = input.nombre;
      existente.role = input.role;
      existente.activo = true;
      existente.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      return this.repo.save(existente);
    }
    return this.create(input);
  }

  async updateRole(id: string, role: Role): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.repo.save(user);
  }

  async setActivo(id: string, activo: boolean): Promise<User> {
    const user = await this.findById(id);
    user.activo = activo;
    return this.repo.save(user);
  }

  verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async changePassword(id: string, current: string, nueva: string) {
    const user = await this.findById(id);
    const ok = await this.verifyPassword(current, user.passwordHash);
    if (!ok) throw new ConflictException('La contrasena actual es incorrecta');
    user.passwordHash = await bcrypt.hash(nueva, BCRYPT_ROUNDS);
    await this.repo.save(user);
  }
}
