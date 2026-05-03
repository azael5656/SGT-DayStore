import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Currency, ExchangeRate } from './entities/exchange-rate.entity';

/**
 * Capa de persistencia de tasas. Aísla las queries para que el service
 * solo se ocupe de las reglas (currency válido, tolerancia, fallbacks).
 */
@Injectable()
export class ExchangeRatesRepository {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly orm: Repository<ExchangeRate>,
  ) {}

  /**
   * Tasa vigente para una moneda en una fecha dada (default: ahora).
   * Devuelve la última con `effectiveFrom ≤ at`.
   */
  findCurrent(currency: 'VES' | 'COP', at: Date = new Date()) {
    return this.orm.findOne({
      where: { currency, effectiveFrom: LessThanOrEqual(at) },
      order: { effectiveFrom: 'DESC' },
    });
  }

  /** Historial completo de tasas, más reciente primero. */
  findAll(currency?: 'VES' | 'COP') {
    return this.orm.find({
      where: currency ? { currency } : {},
      order: { effectiveFrom: 'DESC' },
    });
  }

  create(data: Partial<ExchangeRate>) {
    const r = this.orm.create(data);
    return this.orm.save(r);
  }
}

/** Helper de tipo para no tener que importar el Currency en otros sitios. */
export type CurrencyType = Currency;
