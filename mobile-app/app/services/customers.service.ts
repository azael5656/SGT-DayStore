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

export const customersService = {
  /** Lista o busca por cédula/nombre. */
  async list(query?: string): Promise<Customer[]> {
    const params = query ? { q: query } : {};
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
  async desactivar(id: string): Promise<{ mensaje: string }> {
    const { data } = await api.delete<{ mensaje: string }>(
      `/api/negocio/customers/${id}`,
    );
    return data;
  },
};
