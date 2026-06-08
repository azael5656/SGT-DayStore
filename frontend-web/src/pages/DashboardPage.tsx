import { useMemo, ReactNode } from 'react';
import {
  Thermometer,
  Droplet,
  Zap,
  DoorOpen,
  Activity,
  Siren,
  Radio,
  BellRing,
  type LucideIcon,
} from 'lucide-react';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import type { SensorReading } from '../types';
import { labelSensor, labelTipo } from '../utils/labels';
import Badge from '../components/ui/Badge';
import KpiCard from '../components/ui/KpiCard';
import PageHeader from '../components/ui/PageHeader';

type KpiTone = 'neutral' | 'success' | 'warning' | 'danger';

interface SensorConf {
  label: string;
  Icon: LucideIcon;
  render: (r: SensorReading) => { valor: string; tone: KpiTone };
}

// Una lectura binaria (movimiento/vibracion) solo cuenta como "activa" si su
// ultimo evento en 1 fue hace < 20s. Mantiene la logica original.
const reciente = (r: SensorReading) =>
  r.valor === 1 && Date.now() - new Date(r.fecha).getTime() < 20_000;

// Config por tipo de sensor conocido. Los tipos NO listados aqui (sensores
// nuevos que conectes despues) se muestran con un formato generico.
const CONF: Record<string, SensorConf> = {
  temperatura: {
    label: 'Temperatura',
    Icon: Thermometer,
    render: (r) => ({ valor: `${r.valor}°C`, tone: r.valor > 28 ? 'danger' : 'success' }),
  },
  humedad: {
    label: 'Humedad',
    Icon: Droplet,
    render: (r) => ({ valor: `${r.valor}%`, tone: 'neutral' }),
  },
  corriente: {
    label: 'Corriente',
    Icon: Zap,
    render: (r) => ({
      valor: r.valor === 0 ? 'SIN ENERGIA' : `${r.valor} W`,
      tone: r.valor === 0 ? 'danger' : 'success',
    }),
  },
  puerta: {
    label: 'Puerta',
    Icon: DoorOpen,
    render: (r) => ({
      valor: r.valor === 1 ? 'Abierta' : 'Cerrada',
      tone: r.valor === 1 ? 'danger' : 'success',
    }),
  },
  movimiento: {
    label: 'Movimiento',
    Icon: Activity,
    render: (r) => ({ valor: reciente(r) ? 'Detectado' : 'Tranquilo', tone: reciente(r) ? 'warning' : 'success' }),
  },
  vibracion: {
    label: 'Vibracion',
    Icon: Activity,
    render: (r) => ({ valor: reciente(r) ? 'GOLPE' : 'Estable', tone: reciente(r) ? 'danger' : 'success' }),
  },
  buzzer: {
    label: 'Buzzer',
    Icon: Siren,
    render: (r) => ({ valor: r.valor === 1 ? 'Sonando' : 'Silencio', tone: r.valor === 1 ? 'danger' : 'success' }),
  },
};

// Orden de aparicion de los tipos conocidos.
const ORDEN = ['temperatura', 'humedad', 'corriente', 'puerta', 'movimiento', 'vibracion', 'buzzer'];

export default function DashboardPage() {
  const { readings, alerts, conectado } = useRealtimeIoT();
  const sinReconocer = alerts.filter((a) => !a.reconocida).length;

  // Ultima lectura por tipo. Solo se muestran los sensores que REALMENTE
  // reportan datos; si conectas uno nuevo, aparece solo.
  const porTipo = useMemo(() => {
    const m: Record<string, SensorReading> = {};
    for (const r of readings) {
      const prev = m[r.tipo];
      if (!prev || r.fecha > prev.fecha) m[r.tipo] = r;
    }
    return m;
  }, [readings]);

  // Tipos presentes: primero los conocidos en orden, luego cualquier tipo nuevo.
  const tipos = useMemo(() => {
    const presentes = Object.keys(porTipo);
    const conocidos = ORDEN.filter((t) => presentes.includes(t));
    const extra = presentes.filter((t) => !ORDEN.includes(t)).sort();
    return [...conocidos, ...extra];
  }, [porTipo]);

  return (
    <div>
      <PageHeader
        title="Dashboard en vivo"
        actions={
          <Badge tone={conectado ? 'success' : 'danger'}>
            {conectado ? '● EN VIVO' : '○ desconectado'}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tipos.map((tipo) => {
          const r = porTipo[tipo];
          const conf = CONF[tipo];
          const Icon = conf?.Icon ?? Radio;
          const out = conf
            ? conf.render(r)
            : { valor: `${r.valor}${r.unidad ? ` ${r.unidad}` : ''}`, tone: 'neutral' as KpiTone };
          return (
            <KpiCard
              key={tipo}
              tone={out.tone}
              label={conf?.label ?? labelTipo(tipo)}
              value={out.valor}
              icon={<Icon size={18} strokeWidth={1.75} />}
            />
          );
        })}
        <KpiCard
          tone={sinReconocer > 0 ? 'danger' : 'success'}
          label="Alertas sin revisar"
          value={String(sinReconocer)}
          icon={<BellRing size={18} strokeWidth={1.75} />}
        />
      </div>

      <h2 className="mt-8 mb-3 text-sm uppercase tracking-wide text-text-muted font-semibold">
        Ultimas lecturas por sensor
      </h2>
      <div className="bg-surface rounded-2xl border border-border divide-y divide-border">
        {readings.length === 0 ? (
          <div className="px-4 py-8 text-center text-text-muted">
            Esperando lecturas de los sensores...
          </div>
        ) : (
          readings.map((l) => {
            const IconoSensor = CONF[l.tipo]?.Icon ?? Radio;
            return (
              <div
                key={l.sensorId + '::' + l.tipo}
                className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <IconoSensor size={16} strokeWidth={1.75} className="text-accent" />
                    {labelSensor(l.sensorId)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {new Date(l.fecha).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-accent">
                    {l.valor} <span className="text-xs text-text-muted">{l.unidad}</span>
                  </div>
                  <div className="text-xs text-text-muted">{labelTipo(l.tipo)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
