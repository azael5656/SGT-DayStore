import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { iotService, type Alert, type SensorReading } from '../services/iot.service';
import { getRealtimeSocket } from '../services/realtime.service';

/**
 * Estado realtime IoT compartido por toda la app autenticada.
 * Antes cada pantalla montaba su propio hook y arrancaba con alerts=[]
 * porque el evento 'snapshot' solo se emite al conectar el socket (la
 * primera pantalla lo capturaba, las siguientes arrancaban vacias).
 * Ahora el Provider vive una sola vez en el AppNavigator y todas las
 * pantallas leen de aqui.
 *
 * Seed inicial: al montar hace GET /alerts una vez para no depender del
 * timing del snapshot del socket.
 */
interface Ctx {
  readings: SensorReading[];
  alerts: Alert[];
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
  conectado: boolean;
}

const RealtimeIoTContext = createContext<Ctx | null>(null);

export function RealtimeIoTProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [conectado, setConectado] = useState(false);

  const fetchAlertasSeed = useCallback(async () => {
    try {
      const lista = await iotService.alertas();
      setAlerts(lista);
    } catch {
      /* el socket luego rellena */
    }
  }, []);

  useEffect(() => {
    // Seed por REST para no depender del timing del snapshot.
    void fetchAlertasSeed();

    const socket = getRealtimeSocket();
    const onConnect = () => setConectado(true);
    const onDisconnect = () => setConectado(false);
    const onSnapshot = (data: { readings: SensorReading[]; alerts: Alert[] }) => {
      setReadings(data.readings);
      setAlerts(data.alerts);
    };
    const onReading = (r: SensorReading) => {
      setReadings((prev) => {
        const sinPrevia = prev.filter((x) => x.sensorId !== r.sensorId);
        return [r, ...sinPrevia];
      });
    };
    const onAlert = (a: Alert) => {
      setAlerts((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
    };
    const onAlertAck = (a: Alert) => {
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? a : x)));
    };
    const onAlertsCleared = () => setAlerts([]);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('snapshot', onSnapshot);
    socket.on('reading', onReading);
    socket.on('alert', onAlert);
    socket.on('alert.ack', onAlertAck);
    socket.on('alerts.cleared', onAlertsCleared);

    if (socket.connected) setConectado(true);
    else socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('snapshot', onSnapshot);
      socket.off('reading', onReading);
      socket.off('alert', onAlert);
      socket.off('alert.ack', onAlertAck);
      socket.off('alerts.cleared', onAlertsCleared);
    };
  }, [fetchAlertasSeed]);

  return (
    <RealtimeIoTContext.Provider
      value={{ readings, alerts, setAlerts, conectado }}>
      {children}
    </RealtimeIoTContext.Provider>
  );
}

export function useRealtimeIoT(): Ctx {
  const ctx = useContext(RealtimeIoTContext);
  if (!ctx)
    throw new Error('useRealtimeIoT debe usarse dentro de RealtimeIoTProvider');
  return ctx;
}
