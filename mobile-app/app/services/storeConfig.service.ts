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

export const storeConfigService = {
  async get(): Promise<StoreConfig> {
    const { data } = await api.get<StoreConfig>('/api/iot/store/config');
    return data;
  },
  async update(input: UpdateStoreConfigInput): Promise<StoreConfig> {
    const { data } = await api.put<StoreConfig>('/api/iot/store/config', input);
    return data;
  },
  async isOpenNow(): Promise<boolean> {
    const { data } = await api.get<{ abierta: boolean }>(
      '/api/iot/store/config/is-open',
    );
    return data.abierta;
  },
};
