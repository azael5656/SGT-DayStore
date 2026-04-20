import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import type { Page, SensorReading } from '../types';

const TIPOS = [
  { label: 'Temperatura', value: 'temperatura', unidad: '°C', color: '#DC2626' },
  { label: 'Humedad', value: 'humedad', unidad: '%', color: '#2563EB' },
  { label: 'Corriente', value: 'corriente', unidad: 'W', color: '#F59E0B' },
  { label: 'Puerta', value: 'puerta', unidad: '', color: '#7C3AED' },
  { label: 'Vibracion', value: 'vibracion', unidad: '', color: '#DB2777' },
  { label: 'Movimiento', value: 'movimiento', unidad: '', color: '#0EA5E9' },
];

interface SparklineProps {
  values: number[];
  width: number;
  height: number;
  color: string;
}
function Sparkline({ values, width, height, color }: SparklineProps) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const puntos = values
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height}>
      <polyline points={puntos} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export default function HistoricoPage() {
  const [tipo, setTipo] = useState('temperatura');
  const [items, setItems] = useState<SensorReading[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await api.get<Page<SensorReading>>(
        '/api/iot/sensors/readings/historico',
        { params: { tipo, limit: 200 } },
      );
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const tipoActivo = TIPOS.find((t) => t.value === tipo)!;
  const valores = useMemo(() => [...items].reverse().map((r) => r.valor), [items]);
  const ultimo = items[0];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Historico IoT</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTipo(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              tipo === t.value
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex justify-between items-center">
        <div>
          <div className="text-xs uppercase text-gray-500">Ultimo valor</div>
          <div className="text-3xl font-bold text-primary mt-1">
            {ultimo ? `${ultimo.valor}${tipoActivo.unidad}` : '—'}
          </div>
          <div className="text-xs text-gray-500">{total} lecturas guardadas</div>
        </div>
        <Sparkline values={valores} width={420} height={70} color={tipoActivo.color} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Cuando</th>
              <th className="px-3 py-2">Sensor</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {items.map((r, i) => (
              <tr key={r.sensorId + i}>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {new Date(r.fecha).toLocaleString()}
                </td>
                <td className="px-3 py-2 font-medium">{r.sensorId}</td>
                <td className="px-3 py-2 text-right font-bold">
                  {r.valor}
                  <span className="ml-1 text-xs text-gray-400">{r.unidad}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
