import { useEffect, useState } from 'react';
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
  const [abierta, setAbierta] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; txt: string } | null>(null);

  const cargar = async () => {
    const [c, o] = await Promise.all([
      api.get<StoreConfig>('/api/iot/store/config'),
      api.get<{ abierta: boolean }>('/api/iot/store/config/is-open'),
    ]);
    setCfg(c.data);
    setAbierta(o.data.abierta);
  };

  useEffect(() => {
    cargar().catch(() => {});
  }, []);

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
      const o = await api.get<{ abierta: boolean }>(
        '/api/iot/store/config/is-open',
      );
      setAbierta(o.data.abierta);
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

  if (!cfg) return <div className="text-gray-500">Cargando configuracion...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-5">Horario de la tienda</h1>

      <div
        className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
          abierta ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
        <span className="text-2xl">{abierta ? '🟢' : '🔴'}</span>
        <div>
          <div className="font-bold">
            La tienda esta {abierta ? 'ABIERTA' : 'CERRADA'}
          </div>
          <div className="text-xs text-gray-600">
            {abierta
              ? 'Los movimientos son normales, no generan alertas.'
              : 'Cualquier movimiento detectado creara una alerta.'}
          </div>
        </div>
      </div>

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
              type="text"
              value={cfg.horarioApertura}
              onChange={(e) => actualizar({ horarioApertura: e.target.value })}
              placeholder="09:00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600 mb-1 block">Cierra a las</span>
            <input
              type="text"
              value={cfg.horarioCierre}
              onChange={(e) => actualizar({ horarioCierre: e.target.value })}
              placeholder="20:00"
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
              Fuerza "cerrado" ahora mismo. Util cuando sales de la tienda
              fuera del horario habitual.
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
          <div className="font-semibold text-sm">Cerrar hoy a las (cierre temprano)</div>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Si hoy cierras antes del horario habitual. Ej: 16:00. Deja vacio
            para usar el horario normal.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={cfg.cerrarHoyA ?? ''}
              onChange={(e) =>
                actualizar({ cerrarHoyA: e.target.value || null })
              }
              placeholder="HH:MM"
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
            Fecha (YYYY-MM-DD) hasta la cual la tienda esta cerrada. Todo lo
            que pase en ese periodo disparara alerta.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={cfg.vacacionesHasta ?? ''}
              onChange={(e) =>
                actualizar({ vacacionesHasta: e.target.value || null })
              }
              placeholder="2026-05-15"
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
