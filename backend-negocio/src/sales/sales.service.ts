import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { User } from '../auth/entities/user.entity';
import { CustomersRepository } from '../customers/customers.repository';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { ProductsRepository } from '../products/products.repository';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto, CreateSalePaymentDto } from './dto/create-sale.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { RegisterAbonoDto } from './dto/register-abono.dto';
import {
  COMBINACIONES_VALIDAS,
  SalePayment,
} from './entities/sale-payment.entity';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalesRepository } from './sales.repository';

interface Actor {
  sub: string;
  email?: string;
  role?: 'superadmin' | 'admin' | 'vendedor';
}

const FORMATO_DECIMAL = 2;
const TOLERANCIA_USD = 0.01;

/**
 * Servicio de ventas.
 *
 * Soporta dos modalidades:
 *
 *  **Contado** (caso típico):
 *   - 1+ pagos que cubren el total exacto.
 *   - Cliente opcional (anónimo permitido).
 *   - Estado final: `completada`. Saldo: 0.
 *
 *  **Crédito**:
 *   - Cliente OBLIGATORIO (con cédula).
 *   - 0+ pagos al crear (puede no pagar nada inicial: 100% fiado).
 *   - Si los pagos < total → estado `pendiente`, saldo = total - pagado.
 *   - El dueño registra abonos posteriores con `registerAbono`.
 *   - Cuando saldo = 0 → estado `completada`.
 *
 * Otras reglas:
 *  - Stock se descuenta al CREAR (sin importar si pagó completo).
 *  - Anular = restaurar stock + estado `anulada`. NO devuelve dinero
 *    automáticamente (eso es físico).
 *  - Soft delete = `activo=false`. Solo superadmin.
 *  - Cada operación deja audit log.
 */
@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly repo: SalesRepository,
    private readonly products: ProductsRepository,
    private readonly customers: CustomersRepository,
    private readonly rates: ExchangeRatesService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREAR
  // ---------------------------------------------------------------------------

  async create(actor: Actor, dto: CreateSaleDto): Promise<Sale> {
    if (!dto.items?.length) {
      throw new BadRequestException('La venta debe tener al menos un item');
    }

    // Validar tipo de venta y cliente.
    if (dto.tipoVenta === 'credito' && !dto.customerId) {
      throw new BadRequestException(
        'Las ventas a crédito requieren un cliente con cédula registrada',
      );
    }
    if (dto.tipoVenta === 'contado' && (!dto.payments || dto.payments.length === 0)) {
      throw new BadRequestException(
        'Las ventas de contado requieren al menos un pago',
      );
    }

    // Validar combinaciones moneda/método antes de transacción.
    for (const p of dto.payments) {
      const validas = COMBINACIONES_VALIDAS[p.currency];
      if (!validas.includes(p.method)) {
        throw new BadRequestException(
          `Combinación inválida: ${p.currency} no acepta ${p.method}. ` +
            `Métodos permitidos para ${p.currency}: ${validas.join(', ')}.`,
        );
      }
    }

    // Validar cliente si vino.
    if (dto.customerId) {
      const c = await this.customers.findById(dto.customerId);
      if (!c) throw new NotFoundException('Cliente no encontrado');
      if (!c.activo) {
        throw new BadRequestException(
          `El cliente ${c.nombre} está desactivado`,
        );
      }
    }

    const venta = await this.repo.runInTransaction(async (manager) => {
      // 1) Validar productos y construir items.
      const itemsCalculados: Partial<SaleItem>[] = [];
      let totalCentavos = 0;

      for (const item of dto.items) {
        const producto = await this.products.findByIdLocked(manager, item.productId);
        if (!producto) {
          throw new NotFoundException(`Producto ${item.productId} no encontrado`);
        }
        if (!producto.activo) {
          throw new BadRequestException(
            `Producto "${producto.nombre}" está desactivado`,
          );
        }
        if (producto.precio === null || producto.precio === undefined) {
          throw new BadRequestException(
            `Producto "${producto.nombre}" no tiene precio configurado`,
          );
        }
        if (producto.stock < item.cantidad) {
          throw new ConflictException(
            `Stock insuficiente de "${producto.nombre}" — disponibles: ${producto.stock}, solicitados: ${item.cantidad}`,
          );
        }

        const precioUnitarioUsd = Number(producto.precio);
        const subtotal = precioUnitarioUsd * item.cantidad;
        totalCentavos += Math.round(subtotal * 100);

        itemsCalculados.push({
          productId: producto.id,
          productNombre: producto.nombre,
          productCodigo: producto.codigo ?? null,
          cantidad: item.cantidad,
          precioUnitario: precioUnitarioUsd.toFixed(FORMATO_DECIMAL),
          subtotal: subtotal.toFixed(FORMATO_DECIMAL),
        });

        await this.products.decrementStock(manager, producto.id, item.cantidad);
      }

      const totalUsd = totalCentavos / 100;

      // 2) Calcular cada pago (puede estar vacío en crédito sin abono inicial).
      const paymentsCalculados =
        dto.payments.length > 0 ? await this.calcularPayments(dto.payments) : [];
      const sumaPagosUsd = paymentsCalculados.reduce(
        (acc, p) => acc + Number(p.amountUsd),
        0,
      );

      // 3) Validar cuadre según tipo de venta.
      if (dto.tipoVenta === 'contado') {
        const diff = Math.abs(sumaPagosUsd - totalUsd);
        if (diff > TOLERANCIA_USD) {
          throw new BadRequestException(
            `Venta de contado: los pagos (${sumaPagosUsd.toFixed(2)} USD) ` +
              `deben igualar el total (${totalUsd.toFixed(2)} USD). ` +
              `Diferencia: ${diff.toFixed(2)} USD.`,
          );
        }
      } else {
        // Crédito: pagos NO pueden superar el total.
        if (sumaPagosUsd - totalUsd > TOLERANCIA_USD) {
          throw new BadRequestException(
            `Crédito: el abono inicial (${sumaPagosUsd.toFixed(2)} USD) ` +
              `no puede superar el total (${totalUsd.toFixed(2)} USD).`,
          );
        }
      }

      // 4) Determinar estado y saldo.
      const saldoUsd = Math.max(0, totalUsd - sumaPagosUsd);
      const estado: 'pendiente' | 'completada' =
        saldoUsd <= TOLERANCIA_USD ? 'completada' : 'pendiente';

      // 5) Snapshot del vendedor.
      const userInfo = await manager
        .getRepository(User)
        .findOne({ where: { id: actor.sub } });

      // 6) Persistir.
      return this.repo.createWithItemsAndPayments(
        manager,
        {
          userId: actor.sub,
          userEmail: userInfo?.email ?? actor.email ?? null,
          userNombre: userInfo?.nombre ?? null,
          customerId: dto.customerId ?? null,
          tipoVenta: dto.tipoVenta,
          total: totalUsd.toFixed(FORMATO_DECIMAL),
          saldoUsd: saldoUsd.toFixed(FORMATO_DECIMAL),
          estado,
          activo: true,
          fecha: new Date(),
          notas: dto.notas ?? null,
        },
        itemsCalculados,
        paymentsCalculados,
      );
    });

    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'sale.create',
      resource: 'sales',
      resourceId: venta.id,
      metadata: {
        tipoVenta: venta.tipoVenta,
        totalUsd: venta.total,
        saldoUsd: venta.saldoUsd,
        estado: venta.estado,
        customerId: venta.customerId,
        items: venta.items.length,
        pagosIniciales: venta.payments.length,
      },
    });

    return venta;
  }

  /**
   * Calcula `amountUsd` y `exchangeRate` para cada pago consultando la
   * tasa vigente. Para USD: rate=1.
   */
  private async calcularPayments(
    inputs: CreateSalePaymentDto[],
  ): Promise<Partial<SalePayment>[]> {
    const out: Partial<SalePayment>[] = [];
    for (const p of inputs) {
      let rate: number;
      let amountUsd: number;
      if (p.currency === 'USD') {
        rate = 1;
        amountUsd = p.amount;
      } else {
        rate = await this.rates.getRateOrFail(p.currency);
        amountUsd = p.amount / rate;
      }
      out.push({
        currency: p.currency,
        method: p.method,
        amountOriginal: p.amount.toFixed(FORMATO_DECIMAL),
        exchangeRate: rate.toFixed(4),
        amountUsd: amountUsd.toFixed(FORMATO_DECIMAL),
      });
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // REGISTRAR ABONO (solo para ventas a crédito pendientes)
  // ---------------------------------------------------------------------------

  /**
   * Registra un abono adicional sobre una venta a crédito pendiente.
   * Crea un nuevo `SalePayment`, recalcula el saldo y, si llega a 0,
   * marca la venta como `completada`.
   */
  async registerAbono(
    actor: Actor,
    saleId: string,
    dto: RegisterAbonoDto,
  ): Promise<Sale> {
    const validas = COMBINACIONES_VALIDAS[dto.currency];
    if (!validas.includes(dto.method)) {
      throw new BadRequestException(
        `Combinación inválida: ${dto.currency} no acepta ${dto.method}.`,
      );
    }

    const ventaActualizada = await this.repo.runInTransaction(async (manager) => {
      const venta = await this.repo.findByIdLocked(manager, saleId);
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (!venta.activo) {
        throw new ConflictException(
          'La venta está soft-deleted; no se pueden registrar abonos',
        );
      }
      if (venta.tipoVenta !== 'credito') {
        throw new BadRequestException(
          'Solo se pueden registrar abonos en ventas a crédito',
        );
      }
      if (venta.estado !== 'pendiente') {
        throw new ConflictException(
          `La venta está en estado ${venta.estado}; no se pueden registrar abonos`,
        );
      }

      // Calcular conversión a USD con la tasa vigente.
      let rate: number;
      let amountUsd: number;
      if (dto.currency === 'USD') {
        rate = 1;
        amountUsd = dto.amount;
      } else {
        rate = await this.rates.getRateOrFail(dto.currency);
        amountUsd = dto.amount / rate;
      }

      const saldoActual = Number(venta.saldoUsd);
      // Permitir que el último abono cubra el saldo con tolerancia.
      if (amountUsd - saldoActual > TOLERANCIA_USD) {
        throw new BadRequestException(
          `El abono (${amountUsd.toFixed(2)} USD) supera el saldo pendiente ` +
            `(${saldoActual.toFixed(2)} USD).`,
        );
      }

      // Insertar el SalePayment.
      await this.repo.createPaymentInTransaction(manager, {
        saleId: venta.id,
        currency: dto.currency,
        method: dto.method,
        amountOriginal: dto.amount.toFixed(FORMATO_DECIMAL),
        exchangeRate: rate.toFixed(4),
        amountUsd: amountUsd.toFixed(FORMATO_DECIMAL),
      });

      const nuevoSaldo = Math.max(0, saldoActual - amountUsd);
      const nuevoEstado: 'pendiente' | 'completada' =
        nuevoSaldo <= TOLERANCIA_USD ? 'completada' : 'pendiente';

      // Actualizamos solo el header — no `save(venta)` para no cascadear
      // los payments cargados (rompería el saleId del nuevo).
      await this.repo.updateSaleHeader(manager, venta.id, {
        saldoUsd: nuevoSaldo.toFixed(FORMATO_DECIMAL),
        estado: nuevoEstado,
      });

      venta.saldoUsd = nuevoSaldo.toFixed(FORMATO_DECIMAL);
      venta.estado = nuevoEstado;
      return venta;
    });

    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'sale.abono',
      resource: 'sales',
      resourceId: saleId,
      metadata: {
        currency: dto.currency,
        method: dto.method,
        amountOriginal: dto.amount,
        nuevoSaldoUsd: ventaActualizada.saldoUsd,
        estadoNuevo: ventaActualizada.estado,
        notas: dto.notas,
      },
    });

    // Recargar para devolver con todos los pagos incluido el nuevo.
    const recargada = await this.repo.findById(saleId, true);
    return recargada ?? ventaActualizada;
  }

  // ---------------------------------------------------------------------------
  // LISTAR
  // ---------------------------------------------------------------------------

  findAll(actor: Actor, query: QuerySalesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const esGerencia = actor.role === 'admin' || actor.role === 'superadmin';
    const userId = esGerencia ? query.userId : actor.sub;

    const incluirInactivas =
      actor.role === 'superadmin' && query.incluirInactivas === 'true';

    return this.repo.findAllPaginated({
      desde: query.desde ? new Date(query.desde) : undefined,
      hasta: query.hasta ? new Date(query.hasta) : undefined,
      userId,
      customerId: query.customerId,
      tipoVenta: query.tipoVenta,
      estado: query.estado,
      incluirAnuladas: query.incluirAnuladas === 'true',
      incluirInactivas,
      page,
      limit,
    });
  }

  async findOne(actor: Actor, id: string): Promise<Sale> {
    const incluirInactivas = actor.role === 'superadmin';
    const venta = await this.repo.findById(id, incluirInactivas);
    if (!venta) throw new NotFoundException('Venta no encontrada');

    if (actor.role === 'vendedor' && venta.userId !== actor.sub) {
      throw new ForbiddenException('No tienes permiso para ver esta venta');
    }

    return venta;
  }

  // ---------------------------------------------------------------------------
  // ANULAR
  // ---------------------------------------------------------------------------

  async cancel(actor: Actor, id: string, dto: CancelSaleDto): Promise<Sale> {
    if (actor.role !== 'admin' && actor.role !== 'superadmin') {
      throw new ForbiddenException(
        'Solo administradores pueden anular ventas',
      );
    }

    const ventaActualizada = await this.repo.runInTransaction(async (manager) => {
      const venta = await this.repo.findByIdLocked(manager, id);
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.estado === 'anulada') {
        throw new ConflictException('La venta ya estaba anulada');
      }
      if (!venta.activo) {
        throw new ConflictException(
          'La venta está soft-deleted; no se puede anular',
        );
      }

      for (const item of venta.items) {
        await this.products.incrementStock(manager, item.productId, item.cantidad);
      }

      venta.estado = 'anulada';
      venta.motivoAnulacion = dto.motivo;
      venta.anuladaPor = actor.sub;
      venta.anuladaEn = new Date();
      return this.repo.saveInTransaction(manager, venta);
    });

    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'sale.cancel',
      resource: 'sales',
      resourceId: id,
      metadata: {
        motivo: dto.motivo,
        totalUsdRestaurado: ventaActualizada.total,
        items: ventaActualizada.items.length,
      },
    });

    return ventaActualizada;
  }

  // ---------------------------------------------------------------------------
  // SOFT DELETE
  // ---------------------------------------------------------------------------

  async softDelete(actor: Actor, id: string): Promise<{ mensaje: string }> {
    if (actor.role !== 'superadmin') {
      throw new ForbiddenException(
        'Solo superadmin puede soft-deletar ventas',
      );
    }

    const venta = await this.repo.findById(id, true);
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (!venta.activo) {
      return { mensaje: `Venta ${id} ya estaba soft-deleted` };
    }

    if (venta.estado !== 'anulada') {
      this.logger.warn(
        `softDelete sobre venta ${venta.estado} ${id} — stock NO se restaura`,
      );
    }

    await this.repo.runInTransaction(async (manager) => {
      venta.activo = false;
      await this.repo.saveInTransaction(manager, venta);
    });

    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'sale.delete',
      resource: 'sales',
      resourceId: id,
      metadata: { estadoPrevio: venta.estado, tipoVenta: venta.tipoVenta },
    });

    return { mensaje: `Venta ${id} marcada como inactiva` };
  }

  // ---------------------------------------------------------------------------
  // REPORTES (en USD, solo completadas)
  // ---------------------------------------------------------------------------

  async reportDaily(query: QueryReportDto) {
    const { desde, hasta } = this.resolverRango(query, 30);
    const ventas = await this.repo.reportDaily(desde, hasta);
    return {
      moneda: 'USD',
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      ventas,
    };
  }

  async reportMonthly(query: QueryReportDto) {
    const { desde, hasta } = this.resolverRango(query, 365);
    const ventas = await this.repo.reportMonthly(desde, hasta);
    return {
      moneda: 'USD',
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      ventas,
    };
  }

  /**
   * Dashboard de negocio — devuelve todos los KPIs agregados en un solo
   * payload para que el frontend los pinte sin hacer N requests.
   *
   * Incluye:
   *  - ventasHoy, ventasSemana, ventasMes (total USD + cantidad).
   *  - ticketPromedio del mes.
   *  - topProductos del mes (top 5 por unidades vendidas).
   *  - resumen de deudas (cantidad de pendientes + suma de saldos).
   *  - stockBajo (productos con stock < stockMinimo).
   *  - distribución de pagos por moneda y por método en el mes.
   *  - serie diaria de los últimos 14 días para gráfico de tendencia.
   */
  async getDashboard() {
    const ahora = new Date();
    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000 - 1);
    const inicioSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicio14d = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      ventasHoy,
      ventasSemana,
      ventasMes,
      topProductos,
      deudas,
      stockBajo,
      distribucion,
      serieDiaria,
    ] = await Promise.all([
      this.repo.sumarVentasEnRango(inicioHoy, finHoy),
      this.repo.sumarVentasEnRango(inicioSemana, ahora),
      this.repo.sumarVentasEnRango(inicioMes, ahora),
      this.repo.topProductos(inicioMes, ahora, 5),
      this.repo.resumenDeudas(),
      this.products.countLowStock(),
      this.repo.distribucionPagos(inicioMes, ahora),
      this.repo.reportDaily(inicio14d, ahora),
    ]);

    const ticketPromedio =
      ventasMes.cantidad > 0 ? ventasMes.totalUsd / ventasMes.cantidad : 0;

    return {
      generadoEn: ahora.toISOString(),
      moneda: 'USD',
      ventas: {
        hoy: ventasHoy,
        semana: ventasSemana,
        mes: ventasMes,
        ticketPromedio,
      },
      topProductos: topProductos.map((p) => ({
        productId: p.productId,
        nombre: p.nombre,
        unidades: Number(p.unidades),
        totalUsd: Number(p.totalUsd),
      })),
      deudas,
      stockBajo,
      distribucion: {
        porMoneda: distribucion.porMoneda.map((m) => ({
          currency: m.currency,
          totalUsd: Number(m.totalUsd),
          cantidad: Number(m.cantidad),
        })),
        porMetodo: distribucion.porMetodo.map((m) => ({
          method: m.method,
          totalUsd: Number(m.totalUsd),
          cantidad: Number(m.cantidad),
        })),
      },
      serieDiaria,
    };
  }

  private resolverRango(query: QueryReportDto, dias: number) {
    const hasta = query.hasta ? new Date(query.hasta) : new Date();
    const desde = query.desde
      ? new Date(query.desde)
      : new Date(hasta.getTime() - dias * 24 * 60 * 60 * 1000);
    return { desde, hasta };
  }
}
