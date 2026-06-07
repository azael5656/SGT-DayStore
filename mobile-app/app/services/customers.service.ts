import api from './api';

/**
 * Wrapper del API de clientes/deudores (`/api/negocio/customers/*`).
 *
 * Las ventas a crédito requieren un cliente registrado aquí (con cédula
 * única). Las ventas de contado anónimas no necesitan cliente.
 */

export interface Customer {
  id: string;
  cedula: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  cedula: string;
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

export interface UpdateCustomerInput {
  cedula?: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  notas?: string;
  activo?: boolean;
}

// --- Tipos para el historial del cliente. ---
// Snapshots ligeros de las entidades que vienen del backend; no
// pretenden ser exhaustivos, solo los campos que muestra la UI.

export interface SalePaymentHistorial {
  id: string;
  amount: string;
  amountUsd: string;
  currency: string;
  method: string;
  fecha: string;
  exchangeRate?: string | null;
}

export interface SaleItemHistorial {
  id: string;
  productNombre: string;
  cantidad: number;
  subtotal: string;
}

export interface SaleHistorial {
  id: string;
  total: string;
  saldoUsd: string;
  estado: 'pendiente' | 'completada' | 'anulada';
  tipoVenta: 'contado' | 'credito';
  fecha: string;
  items?: SaleItemHistorial[];
  payments?: SalePaymentHistorial[];
}

export interface AuditLogItem {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  userEmail: string | null;
  userRole: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface HistorialCliente {
  cliente: Customer;
  resumen: {
    deudaTotalUsd: string;
    ventasPendientes: number;
    ventasCompletadas: number;
    ventasAnuladas: number;
  };
  ventas: SaleHistorial[];
  auditoria: AuditLogItem[];
}

export interface DesactivarResponse {
  mensaje: string;
  ventasAnuladas?: string[];
}

/**
 * Error que el backend lanza cuando se intenta desactivar un cliente
 * con deudas pendientes y el caller no autorizó la anulación. El
 * frontend lo detecta para mostrar el modal de confirmación con
 * cifras reales.
 */
export interface PendingDebtsError {
  code: 'CLIENT_HAS_PENDING_DEBTS';
  cantidad: number;
  totalUsd: string;
  message: string;
}

export const customersService = {
  /** Lista o busca por cédula/nombre. */
  async list(query?: string, incluirInactivos = false): Promise<Customer[]> {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (incluirInactivos) params.incluirInactivos = 'true';
    const { data } = await api.get<Customer[]>('/api/negocio/customers', {
      params,
    });
    return data;
  },
  async findOne(id: string): Promise<Customer> {
    const { data } = await api.get<Customer>(`/api/negocio/customers/${id}`);
    return data;
  },
  async create(input: CreateCustomerInput): Promise<Customer> {
    const { data } = await api.post<Customer>('/api/negocio/customers', input);
    return data;
  },
  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const { data } = await api.patch<Customer>(
      `/api/negocio/customers/${id}`,
      input,
    );
    return data;
  },

  /**
   * Desactiva un cliente. Si tiene deudas pendientes y `cancelDebts`
   * no es true, el backend responde 409 con metadata
   * `{ code: 'CLIENT_HAS_PENDING_DEBTS', cantidad, totalUsd }`.
   * Si `cancelDebts=true`, anula las ventas pendientes en una
   * transaccion antes de desactivar.
   */
  async desactivar(
    id: string,
    options: { cancelDebts?: boolean } = {},
  ): Promise<DesactivarResponse> {
    const params = options.cancelDebts ? { cancelDebts: 'true' } : {};
    const { data } = await api.delete<DesactivarResponse>(
      `/api/negocio/customers/${id}`,
      { params },
    );
    return data;
  },

  /** Reactiva un cliente desactivado. */
  async activar(id: string): Promise<{ mensaje: string }> {
    const { data } = await api.patch<{ mensaje: string }>(
      `/api/negocio/customers/${id}/activar`,
    );
    return data;
  },

  /**
   * Devuelve el historial completo: ventas, deuda y auditoria.
   * Lo consume la pantalla de detalle del cliente.
   */
  async getHistorial(id: string): Promise<HistorialCliente> {
    const { data } = await api.get<HistorialCliente>(
      `/api/negocio/customers/${id}/historial`,
    );
    return data;
  },
};
