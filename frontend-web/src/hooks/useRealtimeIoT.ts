import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  createElement,
} from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { IotAlert, SensorReading } from '../types';
import { alertaVisibleParaRol } from '../utils/labels';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (socket) return socket;
  socket = io('/', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

interface Ctx {
  readings: SensorReading[];
  alerts: IotAlert[];
  conectado: boolean;
}

const RealtimeCtx = createContext<Ctx | null>(null);

export function RealtimeIoTProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [conectado, setConectado] = useState(false);

  // Filtra alertas segun rol: vendedor solo ve incendio + forzado.
  const alertasVisibles = useMemo(
    () => alerts.filter((a) => alertaVisibleParaRol(a.tipo, user?.role)),
    [alerts, user?.role],
  );

  useEffect(() => {
    // Sin sesion no disparamos requests: evitamos un loop de 401 -> refresh
    // -> redirect a /login en pantallas publicas (login).
    if (!user) {
      setConectado(false);
      return;
    }

    // Seed REST para no depender del timing del snapshot del socket.
    (async () => {
      try {
        const [lecturas, lista] = await Promise.all([
          api.get<SensorReading[]>('/api/iot/telemetry/latest'),
          api.get<IotAlert[]>('/api/iot/alerts'),
        ]);
        setReadings(lecturas.data);
        setAlerts(lista.data);
      } catch {
        /* el socket rellena */
      }
    })();

    const s = getSocket();
    const onConnect = () => setConectado(true);
    const onDisconnect = () => setConectado(false);
    const onSnapshot = (data: { readings: SensorReading[]; alerts: IotAlert[] }) => {
      setReadings(data.readings);
      setAlerts(data.alerts);
    };
    const onReading = (r: SensorReading) => {
      // Dedupe por (sensorId + tipo) para que temp/hum del mismo sensor coexistan.
      setReadings((prev) => [
        r,
        ...prev.filter(
          (x) => !(x.sensorId === r.sensorId && x.tipo === r.tipo),
        ),
      ]);
    };
    const onAlert = (a: IotAlert) =>
      setAlerts((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
    const onAlertAck = (a: IotAlert) =>
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? a : x)));
    const onAlertsCleared = () => setAlerts([]);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('snapshot', onSnapshot);
    s.on('reading', onReading);
    s.on('alert', onAlert);
    s.on('alert.ack', onAlertAck);
    s.on('alerts.cleared', onAlertsCleared);

    if (s.connected) setConectado(true);
    else s.connect();

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('snapshot', onSnapshot);
      s.off('reading', onReading);
      s.off('alert', onAlert);
      s.off('alert.ack', onAlertAck);
      s.off('alerts.cleared', onAlertsCleared);
    };
  }, [user]);

  return createElement(
    RealtimeCtx.Provider,
    { value: { readings, alerts: alertasVisibles, conectado } },
    children,
  );
}

export function useRealtimeIoT(): Ctx {
  const ctx = useContext(RealtimeCtx);
  if (!ctx)
    throw new Error('useRealtimeIoT debe usarse dentro de RealtimeIoTProvider');
  return ctx;
}
