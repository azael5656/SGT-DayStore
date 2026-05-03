import api from './api';

/**
 * Wrapper del endpoint de dashboard de negocio.
 * `/api/negocio/sales/reports/dashboard` agrega todos los KPIs en un
 * único payload — pensado para pintar la pantalla "Mi Negocio" sin
 * hacer múltiples requests.
 */

export interface DashboardData {
  generadoEn: string;
  moneda: 'USD';
  ventas: {
    hoy: { totalUsd: number; cantidad: number };
    semana: { totalUsd: number; cantidad: number };
    mes: { totalUsd: number; cantidad: number };
    ticketPromedio: number;
  };
  topProductos: Array<{
    productId: string;
    nombre: string;
    unidades: number;
    totalUsd: number;
  }>;
  deudas: { cantidad: number; totalSaldoUsd: number };
  stockBajo: number;
  distribucion: {
    porMoneda: Array<{ currency: string; totalUsd: number; cantidad: number }>;
    porMetodo: Array<{ method: string; totalUsd: number; cantidad: number }>;
  };
  serieDiaria: Array<{ fecha: string; total: number; cantidad: number }>;
}

export const reportesService = {
  async getDashboard(): Promise<DashboardData> {
    const { data } = await api.get<DashboardData>(
      '/api/negocio/sales/reports/dashboard',
    );
    return data;
  },
};
