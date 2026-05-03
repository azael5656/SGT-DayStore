import { FormEvent, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { CurrentRates, ExchangeRate } from '../types';

/**
 * Página de Tasas de Cambio.
 *
 * El admin abre la tienda y registra la tasa del día (ej. 1 USD = 620 Bs).
 * Esta tasa la usa el sistema para validar pagos en VES y COP cuando se
 * registran ventas multi-moneda.
 *
 * Las tasas viejas se conservan para auditoría histórica — la columna
 * "Vigente desde" muestra cuándo entró en efecto cada una.
 */
export default function TasasPage() {
  const { user } = useAuth();
  const puedeCrear = user?.role === 'admin' || user?.role === 'superadmin';

  const [historial, setHistorial] = useState<ExchangeRate[]>([]);
  const [vigentes, setVigentes] = useState<CurrentRates | null>(null);
  const [cargando, setCargando] = useState(false);
  const [filtroCurrency, setFiltroCurrency] = useState<'VES' | 'COP' | ''>('');
  const [crearAbierto, setCrearAbierto] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [actual, lista] = await Promise.all([
        api.get<CurrentRates>('/api/negocio/exchange-rates/current'),
        api.get<ExchangeRate[]>('/api/negocio/exchange-rates', {
          params: filtroCurrency ? { currency: filtroCurrency } : {},
        }),
      ]);
      setVigentes(actual.data);
      setHistorial(lista.data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCurrency]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Tasas de cambio</h1>
        {puedeCrear && (
          <button
            onClick={() => setCrearAbierto(true)}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold">
            + Subir nueva tasa
          </button>
        )}
      </div>

      {/* Tasas vigentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <RateCard label="USD" value="1.0000" subtitle="Moneda base del sistema" />
        <RateCard
          label="VES"
          value={vigentes?.VES?.toLocaleString() ?? '—'}
          subtitle={
            vigentes?.VES !== null
              ? `1 USD = ${vigentes?.VES?.toLocaleString()} Bs`
              : 'No configurada'
          }
          warning={vigentes?.VES === null}
        />
        <RateCard
          label="COP"
          value={vigentes?.COP?.toLocaleString() ?? '—'}
          subtitle={
            vigentes?.COP !== null
              ? `1 USD = ${vigentes?.COP?.toLocaleString()} COP`
              : 'No configurada'
          }
          warning={vigentes?.COP === null}
        />
      </div>

      <div className="flex gap-2 mb-3">
        <select
          value={filtroCurrency}
          onChange={(e) =>
            setFiltroCurrency(e.target.value as 'VES' | 'COP' | '')
          }
          className={inputCls + ' max-w-xs'}>
          <option value="">Todas las monedas</option>
          <option value="VES">Solo VES</option>
          <option value="COP">Solo COP</option>
        </select>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Vigente desde</th>
              <th className="px-3 py-2">Moneda</th>
              <th className="px-3 py-2 text-right">Tasa (1 USD =)</th>
              <th className="px-3 py-2">Subida por</th>
              <th className="px-3 py-2">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && historial.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  Sin tasas registradas. Sube la primera con "+ Subir nueva tasa".
                </td>
              </tr>
            )}
            {historial.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600">
                  {new Date(r.effectiveFrom).toLocaleString()}
                </td>
                <td className="px-3 py-2 font-semibold">{r.currency}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {Number(r.rate).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs">
                  {r.createdByEmail ?? r.createdBy.slice(0, 8)}
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">
                  {r.notas ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {crearAbierto && (
        <CrearTasaForm
          onCerrar={() => setCrearAbierto(false)}
          onCreada={() => {
            setCrearAbierto(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function RateCard({
  label,
  value,
  subtitle,
  warning,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        warning
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-200'
      }`}>
      <div className="text-xs uppercase font-bold text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && (
        <div
          className={`text-xs mt-1 ${
            warning ? 'text-amber-700 font-semibold' : 'text-gray-500'
          }`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function CrearTasaForm({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void;
  onCreada: () => void;
}) {
  const [currency, setCurrency] = useState<'VES' | 'COP'>('VES');
  const [rate, setRate] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const valor = Number(rate);
    if (!valor || valor <= 0) {
      setError('La tasa debe ser un número positivo');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/api/negocio/exchange-rates', {
        currency,
        rate: valor,
        notas: notas.trim() || undefined,
      });
      onCreada();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Error guardando',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Subir nueva tasa</h3>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <Field label="Moneda">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'VES' | 'COP')}
              className={inputCls}>
              <option value="VES">VES (Bolívar)</option>
              <option value="COP">COP (Peso colombiano)</option>
            </select>
          </Field>
          <Field label={`1 USD equivale a (${currency})`}>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={currency === 'VES' ? '620' : '4000'}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Notas (opcional)">
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="ej. Tasa BCV de hoy"
              className={inputCls}
              maxLength={200}
            />
          </Field>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mt-4 text-xs text-blue-800">
          Las tasas viejas no se borran — quedan para auditoría histórica
          de las ventas que se registraron con ellas.
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-60">
            {guardando ? 'Guardando...' : 'Guardar tasa'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
