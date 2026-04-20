import api from './api';

/**
 * Wrapper del API del microservicio IoT.
 * Todas las rutas van prefijadas con /api/iot (lo resuelve nginx segun el
 * Host). Requieren token JWT, que se agrega automaticamente en api.ts.
 */

export interface SensorReading {
  sensorId: string;
  tipo: 'temperatura' | 'puerta' | 'movimiento' | string;
  valor: number;
  unidad: string;
  fecha: string;
}

export interface TelemetryDashboard {
  temperaturaActual: number;
  humedadActual: number;
  puertaAbierta: boolean;
  movimientoUltimoMinuto: boolean;
  sensoresActivos: number;
  alertasSinRevisar: number;
}

export type AlertSeverity = 'baja' | 'media' | 'alta' | 'critica';

export interface Alert {
  id: string;
  tipo: string;
  severidad: AlertSeverity;
  mensaje: string;
  reconocida: boolean;
  fecha: string;
  reconocidaPor?: string;
  reconocidaEn?: string;
}

export interface AlertStats {
  totalHoy: number;
  sinReconocer: number;
  porSeveridad: Record<AlertSeverity, number>;
}

export const iotService = {
  async telemetriaLatest(): Promise<SensorReading[]> {
    const { data } = await api.get<SensorReading[]>('/api/iot/telemetry/latest');
    return data;
  },

  async telemetriaDashboard(): Promise<TelemetryDashboard> {
    const { data } = await api.get<TelemetryDashboard>('/api/iot/telemetry/dashboard');
    return data;
  },

  async alertas(): Promise<Alert[]> {
    const { data } = await api.get<Alert[]>('/api/iot/alerts');
    return data;
  },

  async alertasStats(): Promise<AlertStats> {
    const { data } = await api.get<AlertStats>('/api/iot/alerts/stats');
    return data;
  },

  async reconocerAlerta(id: string): Promise<Alert> {
    const { data } = await api.put<Alert>(`/api/iot/alerts/${id}/acknowledge`);
    return data;
  },
};
