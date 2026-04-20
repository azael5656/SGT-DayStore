import { useMemo } from 'react';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import type { SensorReading } from '../types';
import { labelSensor, labelTipo } from '../utils/labels';

const ICONOS: Record<string, string> = {
  temperatura: '🌡️',
  humedad: '💧',
  puerta: '🚪',
  movimiento: '🏃',
  vibracion: '📳',
  corriente: '⚡',
  buzzer: '🔊',
};

interface MetricaProps {
  label: string;
  valor: string;
  icono: string;
  color?: string;
}
function Metrica({ label, valor, icono, color = 'border-gray-300' }: MetricaProps) {
  return (
    <div className={`bg-white rounded-xl p-4 border-l-4 ${color} shadow-sm`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
        <span>{icono}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold mt-1">{valor}</div>
    </div>
  );
}

function computar(readings: SensorReading[]) {
  const porTipo: Record<string, SensorReading> = {};
  for (const r of readings) {
    const previa = porTipo[r.tipo];
    if (!previa || r.fecha > previa.fecha) porTipo[r.tipo] = r;
  }
  const ventana = Date.now() - 20_000;
  const recienteY1 = (tipo: string) => {
    const r = porTipo[tipo];
    return Boolean(r && r.valor === 1 && new Date(r.fecha).getTime() >= ventana);
  };
  const alguna = (tipo: string) =>
    readings.some((x) => x.tipo === tipo && x.valor === 1);
  return {
    temperatura: porTipo.temperatura?.valor ?? null,
    humedad: porTipo.humedad?.valor ?? null,
    puertaAbierta: alguna('puerta'),
    movimiento: recienteY1('movimiento'),
    vibracion: recienteY1('vibracion'),
    corriente: porTipo.corriente?.valor ?? null,
    buzzer: porTipo.buzzer?.valor === 1,
  };
}

export default function DashboardPage() {
  const { readings, alerts, conectado } = useRealtimeIoT();
  const r = useMemo(() => computar(readings), [readings]);
  const sinReconocer = alerts.filter((a) => !a.reconocida).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Dashboard en vivo</h1>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-md ${
            conectado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {conectado ? '● EN VIVO' : '○ desconectado'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Metrica
          icono={ICONOS.temperatura}
          label="Temperatura"
          valor={r.temperatura !== null ? `${r.temperatura}°C` : '—'}
          color={r.temperatura !== null && r.temperatura > 28 ? 'border-red-500' : 'border-green-500'}
        />
        <Metrica
          icono={ICONOS.humedad}
          label="Humedad"
          valor={r.humedad !== null ? `${r.humedad}%` : '—'}
        />
        <Metrica
          icono={ICONOS.corriente}
          label="Corriente"
          valor={r.corriente === null ? '—' : r.corriente === 0 ? 'SIN ENERGIA' : `${r.corriente} W`}
          color={r.corriente === 0 ? 'border-red-500' : 'border-green-500'}
        />
        <Metrica
          icono={ICONOS.puerta}
          label="Puerta"
          valor={r.puertaAbierta ? 'Abierta' : 'Cerrada'}
          color={r.puertaAbierta ? 'border-red-500' : 'border-green-500'}
        />
        <Metrica
          icono={ICONOS.movimiento}
          label="Movimiento"
          valor={r.movimiento ? 'Detectado' : 'Tranquilo'}
          color={r.movimiento ? 'border-yellow-500' : 'border-green-500'}
        />
        <Metrica
          icono={ICONOS.vibracion}
          label="Vibracion"
          valor={r.vibracion ? 'GOLPE' : 'Estable'}
          color={r.vibracion ? 'border-red-500' : 'border-green-500'}
        />
        <Metrica
          icono={ICONOS.buzzer}
          label="Buzzer"
          valor={r.buzzer ? 'Sonando' : 'Silencio'}
          color={r.buzzer ? 'border-red-500' : 'border-green-500'}
        />
        <Metrica
          icono="🚨"
          label="Alertas sin revisar"
          valor={String(sinReconocer)}
          color={sinReconocer > 0 ? 'border-red-500' : 'border-green-500'}
        />
      </div>

      <h2 className="mt-8 mb-3 text-sm uppercase tracking-wide text-gray-500 font-semibold">
        Ultimas lecturas por sensor
      </h2>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {readings.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Esperando lecturas del simulador...
          </div>
        ) : (
          readings.map((l) => (
            <div
              key={l.sensorId + '::' + l.tipo}
              className="px-4 py-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">
                  {ICONOS[l.tipo] ?? '📡'} {labelSensor(l.sensorId)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(l.fecha).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {l.valor}{' '}
                  <span className="text-xs text-gray-400">{l.unidad}</span>
                </div>
                <div className="text-xs text-gray-500">{labelTipo(l.tipo)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
