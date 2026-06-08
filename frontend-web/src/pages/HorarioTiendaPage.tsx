import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, Clock, DoorOpen, DoorClosed } from 'lucide-react';
import api from '../api/client';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import DatePicker from '../components/ui/DatePicker';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import PageHeader from '../components/ui/PageHeader';
import TimePicker from '../components/ui/TimePicker';

interface StoreConfig {
  horarioApertura: string;
  horarioCierre: string;
  zonaHoraria: string;
  modoNocturno: boolean;
  vacacionesHasta: string | null;
  cerrarHoyA: string | null;
  cerrarHoyFecha: string | null;
  diasCerrados: number[];
  umbralesAlerta: { temperaturaMax: number; humedadMax: number };
}

interface EstadoTienda {
  abierta: boolean;
  motivo: string;
  horaActual: string;
  hoy: string;
  diaSemana: number;
}

const DIAS = [
  { v: 1, label: 'Lun' },
  { v: 2, label: 'Mar' },
  { v: 3, label: 'Mie' },
  { v: 4, label: 'Jue' },
  { v: 5, label: 'Vie' },
  { v: 6, label: 'Sab' },
  { v: 0, label: 'Dom' },
];

export default function HorarioTiendaPage() {
  const [cfg, setCfg] = useState<StoreConfig | null>(null);
  const [estado, setEstado] = useState<EstadoTienda | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; txt: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refrescarEstado = useCallback(async () => {
    try {
      const e = await api.get<EstadoTienda>('/api/iot/store/config/estado');
      setEstado(e.data);
    } catch {
      /* keep */
    }
  }, []);

  const cargar = useCallback(async () => {
    const [c, e] = await Promise.all([
      api.get<StoreConfig>('/api/iot/store/config'),
      api.get<EstadoTienda>('/api/iot/store/config/estado'),
    ]);
    setCfg(c.data);
    setEstado(e.data);
  }, []);

  useEffect(() => {
    cargar().catch(() => {});
    timerRef.current = setInterval(() => refrescarEstado(), 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cargar, refrescarEstado]);

  const actualizar = (patch: Partial<StoreConfig>) => {
    setCfg((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const toggleDia = (dia: number) => {
    if (!cfg) return;
    const set = new Set(cfg.diasCerrados);
    if (set.has(dia)) set.delete(dia);
    else set.add(dia);
    actualizar({ diasCerrados: [...set].sort() });
  };

  const guardar = async () => {
    if (!cfg) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const { data } = await api.put<StoreConfig>('/api/iot/store/config', {
        horarioApertura: cfg.horarioApertura,
        horarioCierre: cfg.horarioCierre,
        zonaHoraria: cfg.zonaHoraria,
        modoNocturno: cfg.modoNocturno,
        vacacionesHasta: cfg.vacacionesHasta || null,
        cerrarHoyA: cfg.cerrarHoyA || null,
        diasCerrados: cfg.diasCerrados,
      });
      setCfg(data);
      await refrescarEstado();
      setMensaje({ tipo: 'ok', txt: 'Configuracion guardada.' });
    } catch (e) {
      const m =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Error al guardar';
      setMensaje({ tipo: 'err', txt: String(m) });
    } finally {
      setGuardando(false);
    }
  };

  const abrirAhora = async () => {
    const { data } = await api.post<StoreConfig>(
      '/api/iot/store/config/abrir-ahora',
      {},
    );
    setCfg(data);
    await refrescarEstado();
  };

  const cerrarAhora = async () => {
    const { data } = await api.post<StoreConfig>(
      '/api/iot/store/config/cerrar-ahora',
      {},
    );
    setCfg(data);
    await refrescarEstado();
  };

  const seguirHorario = async () => {
    const { data } = await api.post<StoreConfig>(
      '/api/iot/store/config/seguir-horario',
      {},
    );
    setCfg(data);
    await refrescarEstado();
  };

  if (!cfg || !estado)
    return <div className="text-text-muted">Cargando configuracion...</div>;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Horario de la tienda" icon={<Clock size={22} strokeWidth={1.75} />} />

      <Card className="mb-3 flex items-center gap-3">
        {estado.abierta ? (
          <DoorOpen size={28} strokeWidth={1.75} className="text-success shrink-0" />
        ) : (
          <DoorClosed size={28} strokeWidth={1.75} className="text-danger shrink-0" />
        )}
        <div>
          <div className="mb-1">
            <Badge tone={estado.abierta ? 'success' : 'danger'}>
              Tienda {estado.abierta ? 'ABIERTA' : 'CERRADA'}
            </Badge>
          </div>
          <div className="text-sm text-text mt-0.5">{estado.motivo}</div>
          <div className="text-xs text-text-muted mt-0.5">
            Son las {estado.horaActual} en {cfg.zonaHoraria}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        <Button
          variant="secondary"
          onClick={abrirAhora}
          leftIcon={<DoorOpen size={16} strokeWidth={1.75} />}
          className="w-full">
          Abrir ahora
        </Button>
        <Button
          variant="secondary"
          onClick={cerrarAhora}
          leftIcon={<DoorClosed size={16} strokeWidth={1.75} />}
          className="w-full">
          Cerrar ahora
        </Button>
        <Button
          variant="secondary"
          onClick={seguirHorario}
          leftIcon={<CalendarClock size={16} strokeWidth={1.75} />}
          className="w-full">
          Seguir horario
        </Button>
      </div>
      <p className="text-xs text-text-muted italic text-center mb-6">
        "Abrir/Cerrar ahora" fuerzan el estado al instante. "Seguir horario" vuelve al
        automático: usa el horario, días cerrados, vacaciones y cierre temprano de abajo.
      </p>

      {mensaje && (
        <div className="mb-4">
          <Alert tone={mensaje.tipo === 'ok' ? 'success' : 'danger'}>
            {mensaje.txt}
          </Alert>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 items-start mb-6">
        <section className="lg:col-span-2">
          <h3 className="text-xs uppercase tracking-widest font-bold text-text-muted mb-3">
            Horario normal
          </h3>
          <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Abre a las">
            <TimePicker value={cfg.horarioApertura} onChange={(v) => actualizar({ horarioApertura: v })} />
          </Field>
          <Field label="Cierra a las">
            <TimePicker value={cfg.horarioCierre} onChange={(v) => actualizar({ horarioCierre: v })} />
          </Field>
        </div>
        <Field label="Zona horaria">
          <Input
            type="text"
            value={cfg.zonaHoraria}
            onChange={(e) => actualizar({ zonaHoraria: e.target.value })}
            placeholder="America/Bogota"
          />
        </Field>
          </Card>
        </section>
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold text-text-muted mb-3">
            Dias cerrados
          </h3>
          <Card>
        <p className="text-xs text-text-muted mb-2">
          Marca los dias fijos que la tienda no abre.
        </p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => {
            const activo = cfg.diasCerrados.includes(d.v);
            return (
              <Chip
                key={d.v}
                active={activo}
                onClick={() => toggleDia(d.v)}>
                {d.label}
              </Chip>
            );
          })}
        </div>
          </Card>
        </section>
        <section className="lg:col-span-2">
          <h3 className="text-xs uppercase tracking-widest font-bold text-text-muted mb-3">
            Cierres puntuales
          </h3>
          <Card className="space-y-4">
        <div>
          <div className="font-semibold text-sm text-text">Cerrar hoy antes de la hora normal</div>
          <p className="text-xs text-text-muted mt-0.5 mb-2">
            Hoy cierras a las 16:00 en vez del horario habitual, por ejemplo.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <TimePicker
                value={cfg.cerrarHoyA ?? ''}
                onChange={(v) => actualizar({ cerrarHoyA: v || null })}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => actualizar({ cerrarHoyA: null })}>
              Limpiar
            </Button>
          </div>
        </div>

        <hr className="border-border" />

        <div>
          <div className="font-semibold text-sm text-text">Vacaciones hasta</div>
          <p className="text-xs text-text-muted mt-0.5 mb-2">
            Durante las vacaciones cualquier movimiento genera alerta.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker
                value={cfg.vacacionesHasta ?? ''}
                onChange={(v) => actualizar({ vacacionesHasta: v || null })}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => actualizar({ vacacionesHasta: null })}>
              Limpiar
            </Button>
          </div>
        </div>
          </Card>
        </section>
      </div>

      <Button
        onClick={guardar}
        disabled={guardando}
        leftIcon={<Clock size={16} strokeWidth={1.75} />}
        className="mt-6">
        {guardando ? 'Guardando…' : 'Guardar configuracion'}
      </Button>
    </div>
  );
}
