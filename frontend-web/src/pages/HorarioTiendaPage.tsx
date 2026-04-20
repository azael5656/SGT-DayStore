import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';

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

  if (!cfg || !estado)
    return <div className="text-gray-500">Cargando configuracion...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-5">Horario de la tienda</h1>

      <div
        className={`p-4 rounded-xl mb-3 flex items-center gap-3 ${
          estado.abierta ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
        <span className="text-3xl">{estado.abierta ? '🟢' : '🔴'}</span>
        <div>
          <div className="font-bold">
            Tienda {estado.abierta ? 'ABIERTA' : 'CERRADA'}
          </div>
          <div className="text-sm text-gray-700 mt-0.5">{estado.motivo}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Son las {estado.horaActual} en {cfg.zonaHoraria}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={abrirAhora}
          className="py-2.5 rounded-lg border border-green-300 bg-green-50 text-green-700 font-bold hover:bg-green-100">
          🟢 Abrir ahora
        </button>
        <button
          onClick={cerrarAhora}
          className="py-2.5 rounded-lg border border-red-300 bg-red-50 text-red-700 font-bold hover:bg-red-100">
          🔴 Cerrar ahora
        </button>
      </div>
      <p className="text-xs text-gray-500 italic text-center mb-6">
        "Abrir ahora" desactiva modo nocturno, vacaciones y cierre temprano.
        "Cerrar ahora" activa modo nocturno.
      </p>

      {mensaje && (
        <div
          className={`mb-4 px-3 py-2 rounded-md text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
          {mensaje.txt}
        </div>
      )}

      <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-3">
        Horario normal
      </h3>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600 mb-1 block">Abre a las</span>
            <input
              type="time"
              value={cfg.horarioApertura}
              onChange={(e) => actualizar({ horarioApertura: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600 mb-1 block">Cierra a las</span>
            <input
              type="time"
              value={cfg.horarioCierre}
              onChange={(e) => actualizar({ horarioCierre: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-gray-600 mb-1 block">Zona horaria</span>
          <input
            type="text"
            value={cfg.zonaHoraria}
            onChange={(e) => actualizar({ zonaHoraria: e.target.value })}
            placeholder="America/Bogota"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-3">
        Dias cerrados
      </h3>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <p className="text-xs text-gray-500 mb-2">
          Marca los dias fijos que la tienda no abre.
        </p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => {
            const activo = cfg.diasCerrados.includes(d.v);
            return (
              <button
                key={d.v}
                type="button"
                onClick={() => toggleDia(d.v)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                  activo
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-3">
        Cierres puntuales
      </h3>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">Modo nocturno</div>
            <p className="text-xs text-gray-500 mt-0.5">
              Fuerza "cerrado" ahora mismo.
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.modoNocturno}
              onChange={(e) => actualizar({ modoNocturno: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-primary relative">
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${
                  cfg.modoNocturno ? 'translate-x-5' : ''
                }`}
              />
            </div>
          </label>
        </div>

        <hr className="border-gray-200" />

        <div>
          <div className="font-semibold text-sm">Cerrar hoy antes de la hora normal</div>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Hoy cierras a las 16:00 en vez del horario habitual, por ejemplo.
          </p>
          <div className="flex gap-2">
            <input
              type="time"
              value={cfg.cerrarHoyA ?? ''}
              onChange={(e) => actualizar({ cerrarHoyA: e.target.value || null })}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => actualizar({ cerrarHoyA: null })}
              className="px-3 py-2 text-sm bg-gray-100 rounded-md border border-gray-200">
              Limpiar
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <div className="font-semibold text-sm">Vacaciones hasta</div>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Durante las vacaciones cualquier movimiento genera alerta.
          </p>
          <div className="flex gap-2">
            <input
              type="date"
              value={cfg.vacacionesHasta ?? ''}
              onChange={(e) =>
                actualizar({ vacacionesHasta: e.target.value || null })
              }
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => actualizar({ vacacionesHasta: null })}
              className="px-3 py-2 text-sm bg-gray-100 rounded-md border border-gray-200">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={guardar}
        disabled={guardando}
        className="bg-primary text-white px-6 py-3 rounded-md font-semibold disabled:opacity-60">
        {guardando ? 'Guardando...' : 'Guardar configuracion'}
      </button>
    </div>
  );
}
