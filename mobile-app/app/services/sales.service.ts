import api from './api';
import { Customer } from './customers.service';

/**
 * Wrapper del API de ventas (`/api/negocio/sales/*`).
 *
 *  - Precios canónicos en USD.
 *  - Ventas de **contado**: 1+ pagos cubren el total exacto. Cliente opcional.
 *  - Ventas de **crédito**: cliente obligatorio, abono inicial puede ser
 *    parcial (incluso 0). Se registran abonos posteriores con `addAbono`.
 *  - Cada pago/abono guarda su tasa congelada del momento.
 */

export type Currency = 'USD' | 'VES' | 'COP';
export type PaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'pago_movil'
  | 'zelle';
export type EstadoVenta = 'pendiente' | 'completada' | 'anulada';
export type TipoVenta = 'contado' | 'credito';

/** Combinaciones permitidas (debe coincidir con el backend). */
export const COMBINACIONES_VALIDAS: Record<Currency, PaymentMethod[]> = {
  USD: ['zelle', 'efectivo'],
  VES: ['pago_movil', 'transferencia'],
  COP: ['efectivo', 'transferencia'],
};

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productNombre: string;
  productCodigo: string | null;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  createdAt: string;
}

export interface SalePayment {
  id: string;
  saleId: string;
  currency: Currency;
  method: PaymentMethod;
  amountOriginal: string;
  exchangeRate: string;
  amountUsd: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  userId: string;
  userEmail: string | null;
  userNombre: string | null;
  customerId: string | null;
  customer: Customer | null;
  tipoVenta: TipoVenta;
  total: string;
  saldoUsd: string;
  estado: EstadoVenta;
  motivoAnulacion: string | null;
  anuladaPor: string | null;
  anuladaEn: string | null;
  notas: string | null;
  fecha: string;
  activo: boolean;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface CreateSaleItemInput {
  productId: string;
  cantidad: number;
}

export interface CreateSalePaymentInput {
  currency: Currency;
  method: PaymentMethod;
  amount: number;
}

export interface CreateSaleInput {
  items: CreateSaleItemInput[];
  payments: CreateSalePaymentInput[];
  tipoVenta: TipoVenta;
  customerId?: string;
  notas?: string;
}

export interface RegisterAbonoInput {
  currency: Currency;
  method: PaymentMethod;
  amount: number;
  notas?: string;
}

export interface SalesPage {
  items: Sale[];
  total: number;
  page: number;
  limit: number;
}

export interface ListSalesFilter {
  page?: number;
  limit?: number;
  estado?: EstadoVenta;
  tipoVenta?: TipoVenta;
  customerId?: string;
  desde?: string;
  hasta?: string;
  incluirAnuladas?: boolean;
}

export interface CurrentRates {
  USD: 1;
  VES: number | null;
  COP: number | null;
  at: string;
}

export const salesService = {
  async create(input: CreateSaleInput): Promise<Sale> {
    const { data } = await api.post<Sale>('/api/negocio/sales', input);
    return data;
  },

  async list(filter: ListSalesFilter = {}): Promise<SalesPage> {
    const params: Record<string, string | number> = {};
    if (filter.page) params.page = filter.page;
    if (filter.limit) params.limit = filter.limit;
    if (filter.estado) params.estado = filter.estado;
    if (filter.tipoVenta) params.tipoVenta = filter.tipoVenta;
    if (filter.customerId) params.customerId = filter.customerId;
    if (filter.desde) params.desde = filter.desde;
    if (filter.hasta) params.hasta = filter.hasta;
    if (filter.incluirAnuladas) params.incluirAnuladas = 'true';
    const { data } = await api.get<SalesPage>('/api/negocio/sales', { params });
    return data;
  },

  /**
   * Registra un abono adicional sobre una venta a crédito pendiente.
   * Devuelve la venta actualizada con el nuevo pago y saldo recalculado.
   */
  async addAbono(saleId: string, input: RegisterAbonoInput): Promise<Sale> {
    const { data } = await api.post<Sale>(
      `/api/negocio/sales/${saleId}/abonos`,
      input,
    );
    return data;
  },

  async findOne(id: string): Promise<Sale> {
    const { data } = await api.get<Sale>(`/api/negocio/sales/${id}`);
    return data;
  },

  async cancel(id: string, motivo: string): Promise<Sale> {
    const { data } = await api.patch<Sale>(
      `/api/negocio/sales/${id}/cancel`,
      { motivo },
    );
    return data;
  },

  async softDelete(id: string): Promise<{ mensaje: string }> {
    const { data } = await api.delete<{ mensaje: string }>(
      `/api/negocio/sales/${id}`,
    );
    return data;
  },
};

