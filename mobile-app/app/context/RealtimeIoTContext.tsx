import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { iotService, type Alert, type SensorReading } from '../services/iot.service';
import { getRealtimeSocket } from '../services/realtime.service';
import { alertaVisibleParaRol } from '../utils/labels';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [conectado, setConectado] = useState(false);

  /**
   * Vendedor no ve alertas de corte_luz ni movimiento; solo las que afectan
   * su trabajo (incendio, forzado). Admin/super ven todo.
   */
  const alertasVisibles = useMemo(
    () => alerts.filter((a) => alertaVisibleParaRol(a.tipo, user?.role)),
    [alerts, user?.role],
  );

  const fetchSeed = useCallback(async () => {
    // Hacemos fetch en paralelo de lecturas y alertas. Si el snapshot del
    // socket llega despues, se sobrescribe con la version mas fresca.
    try {
      const [lecturas, lista] = await Promise.all([
        iotService.telemetriaLatest(),
        iotService.alertas(),
      ]);
      setReadings(lecturas);
      setAlerts(lista);
    } catch {
      /* el socket luego rellena */
    }
  }, []);

  useEffect(() => {
    void fetchSeed();

    const socket = getRealtimeSocket();
    const onConnect = () => setConectado(true);
    const onDisconnect = () => setConectado(false);
    const onSnapshot = (data: { readings: SensorReading[]; alerts: Alert[] }) => {
      setReadings(data.readings);
      setAlerts(data.alerts);
    };
    const onReading = (r: SensorReading) => {
      setReadings((prev) => {
        // Dedupe por (sensorId + tipo): un mismo sensor fisico puede emitir
        // varios tipos (DHT22 emite temperatura Y humedad). Antes dedupaba
        // solo por sensorId y uno sobrescribia al otro.
        const sinPrevia = prev.filter(
          (x) => !(x.sensorId === r.sensorId && x.tipo === r.tipo),
        );
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
  }, [fetchSeed]);

  return (
    <RealtimeIoTContext.Provider
      value={{ readings, alerts: alertasVisibles, setAlerts, conectado }}>
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
