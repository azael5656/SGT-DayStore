import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { IotAlert, SensorReading } from '../types';

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

export function useRealtimeIoT() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConectado(true);
    const onDisconnect = () => setConectado(false);
    const onSnapshot = (data: { readings: SensorReading[]; alerts: IotAlert[] }) => {
      setReadings(data.readings);
      setAlerts(data.alerts);
    };
    const onReading = (r: SensorReading) => {
      setReadings((prev) => [r, ...prev.filter((x) => x.sensorId !== r.sensorId)]);
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
  }, []);

  return { readings, alerts, conectado };
}
