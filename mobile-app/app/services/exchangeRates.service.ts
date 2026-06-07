import api from './api';
import { CurrentRates } from './sales.service';

/**
 * Wrapper del API de tasas de cambio (`/api/negocio/exchange-rates/*`).
 *
 *  - `getCurrent`: snapshot de tasas vigentes (lo usan ventas para
 *    convertir conversiones live).
 *  - `list`: historial completo (admin).
 *  - `create`: subir tasa nueva del día (admin/superadmin).
 */

export interface ExchangeRate {
  id: string;
  currency: 'VES' | 'COP';
  rate: string;
  effectiveFrom: string;
  createdBy: string;
  createdByEmail: string | null;
  notas: string | null;
  createdAt: string;
}

export interface CreateExchangeRateInput {
  currency: 'VES' | 'COP';
  rate: number;
  notas?: string;
}

export const exchangeRatesService = {
  async getCurrent(): Promise<CurrentRates> {
    const { data } = await api.get<CurrentRates>(
      '/api/negocio/exchange-rates/current',
    );
    return data;
  },
  async list(currency?: 'VES' | 'COP'): Promise<ExchangeRate[]> {
    const params = currency ? { currency } : {};
    const { data } = await api.get<ExchangeRate[]>(
      '/api/negocio/exchange-rates',
      { params },
    );
    return data;
  },
  async create(input: CreateExchangeRateInput): Promise<ExchangeRate> {
    const { data } = await api.post<ExchangeRate>(
      '/api/negocio/exchange-rates',
      input,
    );
    return data;
  },
};
