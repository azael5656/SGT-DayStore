import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomersRepository } from './customers.repository';

interface Actor {
  sub: string;
  email?: string;
  role?: string;
}

/**
 * Servicio de clientes/deudores. Reglas:
 *  - Cédula única (case-sensitive). Si ya existe, 409.
 *  - Soft-delete con `activo=false`. Las ventas históricas conservan
 *    al cliente aunque se desactive.
 *  - Cualquier creación/edición se audita.
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly repo: CustomersRepository,
    private readonly audit: AuditService,
  ) {}

  search(query: string, incluirInactivos = false) {
    return this.repo.search(query, incluirInactivos);
  }

  findAll(incluirInactivos = false) {
    return this.repo.findAll(incluirInactivos);
  }

  async findOne(id: string): Promise<Customer> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  /** Crea o reactiva por cédula. Si ya existe activo, 409. */
  async create(actor: Actor, dto: CreateCustomerDto): Promise<Customer> {
    const existente = await this.repo.findByCedula(dto.cedula);
    if (existente && existente.activo) {
      throw new ConflictException(
        `Ya existe un cliente activo con cédula ${dto.cedula}`,
      );
    }
    let c: Customer;
    if (existente && !existente.activo) {
      // Reactivar y actualizar datos.
      existente.nombre = dto.nombre;
      existente.telefono = dto.telefono ?? null;
      existente.email = dto.email ?? null;
      existente.notas = dto.notas ?? null;
      existente.activo = true;
      c = await this.repo.save(existente);
    } else {
      c = await this.repo.create({
        cedula: dto.cedula,
        nombre: dto.nombre,
        telefono: dto.telefono ?? null,
        email: dto.email ?? null,
        notas: dto.notas ?? null,
        activo: true,
      });
    }
    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'customer.create',
      resource: 'customers',
      resourceId: c.id,
      metadata: { cedula: c.cedula, nombre: c.nombre },
    });
    return c;
  }

  async update(actor: Actor, id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const c = await this.findOne(id);
    if (dto.cedula && dto.cedula !== c.cedula) {
      const otra = await this.repo.findByCedula(dto.cedula);
      if (otra && otra.id !== c.id) {
        throw new ConflictException(
          `Ya existe otro cliente con cédula ${dto.cedula}`,
        );
      }
      c.cedula = dto.cedula;
    }
    if (dto.nombre !== undefined) c.nombre = dto.nombre;
    if (dto.telefono !== undefined) c.telefono = dto.telefono ?? null;
    if (dto.email !== undefined) c.email = dto.email ?? null;
    if (dto.notas !== undefined) c.notas = dto.notas ?? null;
    if (dto.activo !== undefined) c.activo = dto.activo;
    const updated = await this.repo.save(c);
    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'customer.update',
      resource: 'customers',
      resourceId: id,
      metadata: { cambios: dto },
    });
    return updated;
  }

  /** Soft delete. Las ventas históricas conservan la referencia. */
  async desactivar(actor: Actor, id: string): Promise<{ mensaje: string }> {
    const c = await this.findOne(id);
    if (!c.activo) return { mensaje: `Cliente ${c.nombre} ya estaba inactivo` };
    c.activo = false;
    await this.repo.save(c);
    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'customer.deactivate',
      resource: 'customers',
      resourceId: id,
    });
    return { mensaje: `Cliente ${c.nombre} desactivado` };
  }
}
