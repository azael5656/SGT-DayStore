import { useEffect, useState } from 'react';
import { getRealtimeSocket } from '../services/realtime.service';
import type { Alert, SensorReading } from '../services/iot.service';

/**
 * Hook que mantiene en memoria el snapshot vivo de lecturas y alertas,
 * actualizandose automaticamente cada vez que el backend emite un evento
 * por Socket.IO.
 *
 * Al montarse hace un handshake contra /socket.io y escucha:
 *  - 'snapshot' (al conectar): estado completo
 *  - 'reading': una lectura de sensor nueva
 *  - 'alert': alerta nueva
 *  - 'alert.ack': alerta reconocida
 *  - 'alerts.cleared': se limpiaron todas
 */
export function useRealtimeIoT() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
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

    if (socket.connected) {
      setConectado(true);
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('snapshot', onSnapshot);
      socket.off('reading', onReading);
      socket.off('alert', onAlert);
      socket.off('alert.ack', onAlertAck);
      socket.off('alerts.cleared', onAlertsCleared);
    };
  }, []);

  return { readings, alerts, setAlerts, conectado };
}
