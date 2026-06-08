import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import api from '../api/client';
import type { Page, SensorReading } from '../types';
import { labelSensor } from '../utils/labels';
import { CHART_COLORS } from '../utils/chartColors';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';

const TIPOS = [
  { label: 'Temperatura', value: 'temperatura', unidad: '°C' },
  { label: 'Humedad', value: 'humedad', unidad: '%' },
  { label: 'Corriente', value: 'corriente', unidad: 'W' },
  { label: 'Puerta', value: 'puerta', unidad: '' },
  { label: 'Vibracion', value: 'vibracion', unidad: '' },
  { label: 'Movimiento', value: 'movimiento', unidad: '' },
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

  const tipoIndex = TIPOS.findIndex((t) => t.value === tipo);
  const tipoActivo = TIPOS[tipoIndex];
  const tipoColor = CHART_COLORS[tipoIndex];
  const valores = useMemo(() => [...items].reverse().map((r) => r.valor), [items]);
  const ultimo = items[0];

  return (
    <div>
      <PageHeader title="Historico IoT" icon={<TrendingUp size={22} strokeWidth={1.75} />} />

      <div className="flex flex-wrap gap-2 mb-4">
        {TIPOS.map((t) => (
          <Chip
            key={t.value}
            active={tipo === t.value}
            onClick={() => setTipo(t.value)}>
            {t.label}
          </Chip>
        ))}
      </div>

      <Card className="p-4 mb-4 flex justify-between items-center">
        <div>
          <div className="text-xs uppercase text-text-muted">Ultimo valor</div>
          <div className="text-3xl font-heading font-extrabold text-accent mt-1">
            {ultimo ? `${ultimo.valor}${tipoActivo.unidad}` : '—'}
          </div>
          <div className="text-xs text-text-muted">{total} lecturas guardadas</div>
        </div>
        <Sparkline values={valores} width={420} height={70} color={tipoColor} />
      </Card>

      <Table className="min-w-[500px]">
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Cuando</TH>
            <TH>Sensor</TH>
            <TH className="text-right">Valor</TH>
          </TR>
        </THead>
        <TBody>
          {cargando && (
            <TR className="hover:bg-transparent">
              <TD colSpan={3} className="py-6 text-center text-text-muted">
                Cargando...
              </TD>
            </TR>
          )}
          {items.map((r, i) => (
            <TR key={r.sensorId + i}>
              <TD className="text-xs text-text-muted whitespace-nowrap">
                {new Date(r.fecha).toLocaleString()}
              </TD>
              <TD className="font-medium">{labelSensor(r.sensorId)}</TD>
              <TD className="text-right font-bold">
                {r.valor}
                <span className="ml-1 text-xs text-text-muted">{r.unidad}</span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
