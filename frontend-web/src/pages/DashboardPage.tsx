import { useMemo, ReactNode } from 'react';
import {
  Thermometer,
  Droplet,
  DoorOpen,
  Siren,
  Radio,
  BellRing,
  WifiOff,
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
  puerta: {
    label: 'Puerta',
    Icon: DoorOpen,
    render: (r) => ({
      valor: r.valor === 1 ? 'Abierta' : 'Cerrada',
      tone: r.valor === 1 ? 'danger' : 'success',
    }),
  },
  buzzer: {
    label: 'Buzzer',
    Icon: Siren,
    render: (r) => ({ valor: r.valor === 1 ? 'Sonando' : 'Silencio', tone: r.valor === 1 ? 'danger' : 'success' }),
  },
};

// Orden de aparicion de los tipos conocidos.
const ORDEN = ['temperatura', 'humedad', 'puerta', 'buzzer'];

/**
 * Valor legible de una lectura. Los sensores de estado/evento (puerta, buzzer,
 * movimiento...) NUNCA muestran el numero crudo: se traducen a palabras. Los
 * numericos (°C, %, W) sí muestran su valor con unidad.
 */
function describir(r: SensorReading): { valor: string; tone: KpiTone } {
  const conf = CONF[r.tipo];
  if (conf) return conf.render(r);
  if (r.unidad === 'estado' || r.unidad === 'evento') {
    return {
      valor: r.valor === 1 ? 'Activo' : 'Inactivo',
      tone: r.valor === 1 ? 'warning' : 'neutral',
    };
  }
  return {
    valor: `${r.valor}${r.unidad ? ` ${r.unidad}` : ''}`,
    tone: 'neutral',
  };
}

export default function DashboardPage() {
  const { readings, alerts, conectado, desconectados } = useRealtimeIoT();
  const sinReconocer = alerts.filter((a) => !a.reconocida).length;

  // Tipos cuyo sensor el watchdog marca sin señal: sus tarjetas muestran
  // "Desconectado" en vez del valor (un DHT22 caido afecta temp + humedad).
  const tiposDesconectados = useMemo(
    () => new Set(desconectados.flatMap((s) => s.tipos)),
    [desconectados],
  );

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
          <div className="flex items-center gap-2">
            {desconectados.length > 0 && (
              <Badge tone="danger">
                <WifiOff size={13} strokeWidth={2} className="inline mr-1 -mt-0.5" />
                {desconectados.length === 1
                  ? '1 sensor sin señal'
                  : `${desconectados.length} sensores sin señal`}
              </Badge>
            )}
            <Badge tone={conectado ? 'success' : 'danger'}>
              {conectado ? '● EN VIVO' : '○ desconectado'}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tipos.map((tipo) => {
          const r = porTipo[tipo];
          const conf = CONF[tipo];
          // Si el watchdog marco este sensor sin señal, la tarjeta avisa
          // "Desconectado" en vez de mostrar un valor que ya no es real.
          const off = tiposDesconectados.has(tipo);
          const Icon = off ? WifiOff : (conf?.Icon ?? Radio);
          const out = off
            ? { valor: 'Desconectado', tone: 'danger' as KpiTone }
            : describir(r);
          return (
            <KpiCard
              key={tipo}
              tone={out.tone}
              label={conf?.label ?? labelTipo(tipo)}
              value={out.valor}
              sub={off ? 'Sin señal del sensor' : undefined}
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
            const off = tiposDesconectados.has(l.tipo);
            const IconoSensor = off ? WifiOff : (CONF[l.tipo]?.Icon ?? Radio);
            return (
              <div
                key={l.sensorId + '::' + l.tipo}
                className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <IconoSensor
                      size={16}
                      strokeWidth={1.75}
                      className={off ? 'text-danger' : 'text-accent'}
                    />
                    {labelSensor(l.sensorId)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {new Date(l.fecha).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  {off ? (
                    <Badge tone="danger">
                      <WifiOff size={12} strokeWidth={2} className="inline mr-1 -mt-0.5" />
                      Desconectado
                    </Badge>
                  ) : (
                    <>
                      <div className="text-lg font-bold text-accent">
                        {describir(l).valor}
                      </div>
                      <div className="text-xs text-text-muted">{labelTipo(l.tipo)}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
