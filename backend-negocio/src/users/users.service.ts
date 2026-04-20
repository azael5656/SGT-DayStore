import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role, User } from '../auth/entities/user.entity';

const BCRYPT_ROUNDS = 10;

interface CreateUserInput {
  email: string;
  password: string;
  nombre: string;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async contarActivosPorRol(role: Role): Promise<number> {
    return this.repo.count({ where: { role, activo: true } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const previa = await this.findByEmail(email);
    if (previa) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = this.repo.create({
      email,
      passwordHash,
      nombre: input.nombre,
      role: input.role,
      activo: true,
    });
    return this.repo.save(user);
  }

  /** Crea o actualiza por email. Idempotente, util para seeds. */
  async upsertByEmail(input: CreateUserInput): Promise<User> {
    const existente = await this.findByEmail(input.email);
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

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
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
