import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeRatesRepository } from './exchange-rates.repository';

interface Actor {
  sub: string;
  email?: string;
  role?: string;
}

export interface CurrentRates {
  /** USD siempre es 1 (moneda base). */
  USD: number;
  /** Cuántos VES por 1 USD. `null` si nunca se ha subido. */
  VES: number | null;
  /** Cuántos COP por 1 USD. `null` si nunca se ha subido. */
  COP: number | null;
  /** Cuándo se calculó este snapshot. */
  at: string;
}

/**
 * Servicio de tasas de cambio.
 *
 * Reglas:
 *  - USD es la moneda base del sistema. No se almacena tasa para sí misma
 *    (se asume rate=1 implícito).
 *  - Solo admin/superadmin pueden crear tasas (validado por `@Roles` en
 *    el controller).
 *  - La tasa "vigente" para una moneda en un momento dado es la última
 *    con `effectiveFrom ≤ ese momento` — esto preserva auditoría
 *    histórica si las tasas se cambian después.
 */
@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly repo: ExchangeRatesRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Sube una tasa nueva. Si el admin no especifica `effectiveFrom`,
   * entra en vigor ahora mismo.
   */
  async create(actor: Actor, dto: CreateExchangeRateDto): Promise<ExchangeRate> {
    if (dto.rate <= 0) {
      throw new BadRequestException('La tasa debe ser positiva');
    }
    const tasa = await this.repo.create({
      currency: dto.currency,
      rate: dto.rate.toFixed(4),
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      createdBy: actor.sub,
      createdByEmail: actor.email ?? null,
      notas: dto.notas ?? null,
    });

    void this.audit.registrar({
      userId: actor.sub,
      userEmail: actor.email ?? null,
      userRole: actor.role ?? null,
      action: 'exchange_rate.create',
      resource: 'exchange_rates',
      resourceId: tasa.id,
      metadata: { currency: tasa.currency, rate: tasa.rate, notas: tasa.notas },
    });

    return tasa;
  }

  /** Lista el historial completo de tasas. */
  findAll(currency?: 'VES' | 'COP') {
    return this.repo.findAll(currency);
  }

  /**
   * Snapshot de tasas vigentes ahora mismo. Lo usa el frontend para
   * mostrar conversiones en vivo y `SalesService` para validar pagos.
   */
  async getCurrentRates(at: Date = new Date()): Promise<CurrentRates> {
    const [ves, cop] = await Promise.all([
      this.repo.findCurrent('VES', at),
      this.repo.findCurrent('COP', at),
    ]);
    return {
      USD: 1,
      VES: ves ? Number(ves.rate) : null,
      COP: cop ? Number(cop.rate) : null,
      at: at.toISOString(),
    };
  }

  /**
   * Tasa vigente puntual de una moneda en una fecha. Lanza 404 si no hay
   * ninguna configurada — el service de ventas confía en que esto exista
   * antes de aceptar pagos en esa moneda.
   */
  async getRateOrFail(
    currency: 'VES' | 'COP',
    at: Date = new Date(),
  ): Promise<number> {
    const tasa = await this.repo.findCurrent(currency, at);
    if (!tasa) {
      throw new NotFoundException(
        `No hay tasa configurada para ${currency}. El admin debe subir una antes de aceptar pagos en esa moneda.`,
      );
    }
    return Number(tasa.rate);
  }
}
