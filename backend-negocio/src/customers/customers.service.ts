import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { SalesRepository } from '../sales/sales.repository';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

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
 *  - Al desactivar con deudas pendientes: 409 con metadata, salvo que
 *    el caller pase `cancelDebts=true` (entonces anula las ventas en
 *    una transacción y registra cada anulación en auditoría).
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly repo: CustomersRepository,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => SalesRepository))
    private readonly salesRepo: SalesRepository,
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

  /**
   * Soft delete. Si el cliente tiene ventas pendientes (deudas vivas)
   * y `cancelDebts !== true`, lanza 409 con metadata para que el
   * frontend muestre confirmacion. Si `cancelDebts === true`, anula
   * esas ventas en la misma transaccion y deja todo auditado.
   */
  async desactivar(
    actor: Actor,
    id: string,
    options: { cancelDebts?: boolean } = {},
  ): Promise<{ mensaje: string; ventasAnuladas?: string[] }> {
    const c = await this.findOne(id);
    if (!c.activo) {
      return { mensaje: `Cliente ${c.nombre} ya estaba inactivo` };
    }

    const pendientes = await this.salesRepo.findPendingByCustomer(id);

    // Caso: tiene deudas y no nos autorizaron a anularlas -> 409 con
    // metadata para que el frontend pregunte al usuario.
    if (pendientes.length > 0 && !options.cancelDebts) {
      const totalUsd = pendientes.reduce(
        (acc, s) => acc + Number(s.saldoUsd),
        0,
      );
      throw new ConflictException({
        code: 'CLIENT_HAS_PENDING_DEBTS',
        message: `${c.nombre} tiene ${pendientes.length} venta(s) pendiente(s) por $${totalUsd.toFixed(2)}.`,
        cantidad: pendientes.length,
        totalUsd: totalUsd.toFixed(2),
      });
    }

    // Caso: tiene deudas y se autorizo anularlas. Hacemos todo en una
    // sola transaccion: anular ventas + desactivar cliente. Si algo
    // falla, ROLLBACK total.
    if (pendientes.length > 0 && options.cancelDebts) {
      const ids = pendientes.map((s) => s.id);
      await this.salesRepo.runInTransaction(async (manager) => {
        await this.salesRepo.cancelSalesInTransaction(manager, ids);
        c.activo = false;
        await manager.getRepository(Customer).save(c);
      });

      // Audit fuera de la transaccion (best-effort, no bloquea).
      const totalUsd = pendientes.reduce(
        (acc, s) => acc + Number(s.saldoUsd),
        0,
      );
      for (const s of pendientes) {
        void this.audit.registrar({
          userId: actor.sub,
          userEmail: actor.email ?? null,
          userRole: actor.role ?? null,
          action: 'sale.cancelled-on-customer-deactivation',
          resource: 'sales',
          resourceId: s.id,
          metadata: { customerId: id, saldoUsdAnulado: s.saldoUsd },
        });
      }
      void this.audit.registrar({
        userId: actor.sub,
        userEmail: actor.email ?? null,
        userRole: actor.role ?? null,
        action: 'customer.deactivate',
        resource: 'customers',
        resourceId: id,
        metadata: {
          ventasAnuladas: ids,
          totalUsdPerdido: totalUsd.toFixed(2),
        },
      });
      return {
        mensaje: `Cliente ${c.nombre} desactivado. Se anularon ${ids.length} venta(s) por $${totalUsd.toFixed(2)}.`,
        ventasAnuladas: ids,
      };
    }

    // Caso simple: sin deudas pendientes.
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

  /** Reactivar un cliente desactivado. */
  async activar(actor: Actor, id: string): Promise<{ mensaje: string }> {
    const c = await this.findOne(id);
    if (c.activo) {
      return { mensaje: `Cliente ${c.nombre} ya estaba activo` };
    }
    c.activo = true;
    await this.repo.save(c);
    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'customer.reactivate',
      resource: 'customers',
      resourceId: id,
    });
    return { mensaje: `Cliente ${c.nombre} reactivado` };
  }

  /**
   * Devuelve un dossier completo del cliente: sus ventas (todas, incluso
   * anuladas), resumen de deuda y el log de auditoria filtrado por
   * resourceId. Lo consume la pantalla de detalle del cliente.
   */
  async getHistorial(id: string) {
    const cliente = await this.findOne(id);

    const ventasPage = await this.salesRepo.findAllPaginated({
      customerId: id,
      incluirAnuladas: true,
      incluirInactivas: false,
      page: 1,
      limit: 100,
    });

    const ventas = ventasPage.items;
    const resumen = ventas.reduce(
      (acc, v) => {
        if (v.estado === 'pendiente') {
          acc.ventasPendientes += 1;
          acc.deudaTotalUsd += Number(v.saldoUsd);
        } else if (v.estado === 'completada') {
          acc.ventasCompletadas += 1;
        } else if (v.estado === 'anulada') {
          acc.ventasAnuladas += 1;
        }
        return acc;
      },
      {
        deudaTotalUsd: 0,
        ventasPendientes: 0,
        ventasCompletadas: 0,
        ventasAnuladas: 0,
      },
    );

    const auditoriaPage = await this.audit.findAll({
      resourceId: id,
      page: 1,
      limit: 100,
    });

    return {
      cliente,
      resumen: {
        ...resumen,
        deudaTotalUsd: resumen.deudaTotalUsd.toFixed(2),
      },
      ventas,
      auditoria: auditoriaPage.items,
    };
  }
}
