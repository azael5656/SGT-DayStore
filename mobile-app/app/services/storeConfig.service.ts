import api from './api';

export interface StoreConfig {
  horarioApertura: string;
  horarioCierre: string;
  zonaHoraria: string;
  modoNocturno: boolean;
  vacacionesHasta: string | null;
  cerrarHoyA: string | null;
  cerrarHoyFecha: string | null;
  diasCerrados: number[];
  umbralesAlerta: {
    temperaturaMax: number;
    humedadMax: number;
  };
}

export type UpdateStoreConfigInput = Partial<
  Omit<StoreConfig, 'cerrarHoyFecha'>
>;

export interface EstadoTienda {
  abierta: boolean;
  motivo: string;
  horaActual: string;
  hoy: string;
  diaSemana: number;
}

export const storeConfigService = {
  async get(): Promise<StoreConfig> {
    const { data } = await api.get<StoreConfig>('/api/iot/store/config');
    return data;
  },
  async update(input: UpdateStoreConfigInput): Promise<StoreConfig> {
    const { data } = await api.put<StoreConfig>('/api/iot/store/config', input);
    return data;
  },
  async estado(): Promise<EstadoTienda> {
    const { data } = await api.get<EstadoTienda>(
      '/api/iot/store/config/estado',
    );
    return data;
  },
  async abrirAhora(): Promise<StoreConfig> {
    const { data } = await api.post<StoreConfig>(
      '/api/iot/store/config/abrir-ahora',
      {},
    );
    return data;
  },
  async cerrarAhora(): Promise<StoreConfig> {
    const { data } = await api.post<StoreConfig>(
      '/api/iot/store/config/cerrar-ahora',
      {},
    );
    return data;
  },
};
