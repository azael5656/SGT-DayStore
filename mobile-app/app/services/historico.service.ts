import api from './api';
import type { SensorReading } from './iot.service';

export interface HistoricoPage {
  items: SensorReading[];
  total: number;
  page: number;
  limit: number;
}

export interface HistoricoFilters {
  tipo?: string;
  sensorId?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export const historicoService = {
  async listar(filtros: HistoricoFilters = {}): Promise<HistoricoPage> {
    const { data } = await api.get<HistoricoPage>(
      '/api/iot/sensors/readings/historico',
      { params: filtros },
    );
    return data;
  },
};
