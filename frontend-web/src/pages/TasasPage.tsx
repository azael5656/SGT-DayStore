import { FormEvent, useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { CurrentRates, ExchangeRate } from '../types';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import KpiCard from '../components/ui/KpiCard';
import Input from '../components/ui/Input';
import Field from '../components/ui/Field';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';

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
      <PageHeader
        title="Tasas de cambio"
        icon={<DollarSign size={22} strokeWidth={1.75} />}
        actions={
          puedeCrear && (
            <Button
              onClick={() => setCrearAbierto(true)}
              leftIcon={<DollarSign size={16} strokeWidth={1.75} />}>
              Subir nueva tasa
            </Button>
          )
        }
      />

      {/* Tasas vigentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <KpiCard label="USD" value="1.0000" sub="Moneda base del sistema" />
        <KpiCard
          label="VES"
          value={vigentes?.VES?.toLocaleString() ?? '—'}
          sub={
            vigentes?.VES !== null
              ? `1 USD = ${vigentes?.VES?.toLocaleString()} Bs`
              : 'No configurada'
          }
          tone={vigentes?.VES === null ? 'warning' : 'neutral'}
        />
        <KpiCard
          label="COP"
          value={vigentes?.COP?.toLocaleString() ?? '—'}
          sub={
            vigentes?.COP !== null
              ? `1 USD = ${vigentes?.COP?.toLocaleString()} COP`
              : 'No configurada'
          }
          tone={vigentes?.COP === null ? 'warning' : 'neutral'}
        />
      </div>

      <div className="flex gap-2 mb-3">
        <Chip
          active={filtroCurrency === ''}
          onClick={() => setFiltroCurrency('')}>
          Todas las monedas
        </Chip>
        <Chip
          active={filtroCurrency === 'VES'}
          onClick={() => setFiltroCurrency('VES')}>
          Solo VES
        </Chip>
        <Chip
          active={filtroCurrency === 'COP'}
          onClick={() => setFiltroCurrency('COP')}>
          Solo COP
        </Chip>
      </div>

      {/* Historial */}
      <Table>
        <THead>
          <tr>
            <TH>Vigente desde</TH>
            <TH>Moneda</TH>
            <TH className="text-right">Tasa (1 USD =)</TH>
            <TH>Subida por</TH>
            <TH>Notas</TH>
          </tr>
        </THead>
        <TBody>
          {cargando && (
            <tr>
              <TD colSpan={5} className="py-6 text-center text-text-muted">
                Cargando...
              </TD>
            </tr>
          )}
          {!cargando && historial.length === 0 && (
            <tr>
              <TD colSpan={5} className="py-6 text-center text-text-muted">
                Sin tasas registradas. Sube la primera con "+ Subir nueva tasa".
              </TD>
            </tr>
          )}
          {historial.map((r) => (
            <TR key={r.id}>
              <TD className="text-text-muted">
                {new Date(r.effectiveFrom).toLocaleString()}
              </TD>
              <TD className="font-semibold">{r.currency}</TD>
              <TD className="text-right font-mono">
                {Number(r.rate).toLocaleString()}
              </TD>
              <TD className="text-text-muted text-xs">
                {r.createdByEmail ?? r.createdBy.slice(0, 8)}
              </TD>
              <TD className="text-text-muted text-xs">
                {r.notas ?? ''}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

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
    <Modal open onClose={onCerrar} title="Subir nueva tasa" maxWidth="sm">
      <form onSubmit={submit}>
        {error && (
          <div className="mb-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}
        <div className="space-y-3">
          <Field label="Moneda">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'VES' | 'COP')}
              className={selectCls}>
              <option value="VES">VES (Bolívar)</option>
              <option value="COP">COP (Peso colombiano)</option>
            </select>
          </Field>
          <Field label={`1 USD equivale a (${currency})`}>
            <Input
              type="number"
              step="0.0001"
              min="0.0001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={currency === 'VES' ? '620' : '4000'}
              required
            />
          </Field>
          <Field label="Notas (opcional)">
            <Input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="ej. Tasa BCV de hoy"
              maxLength={200}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Alert>
            Las tasas viejas no se borran — quedan para auditoría histórica
            de las ventas que se registraron con ellas.
          </Alert>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar tasa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Select tokenizado: mismas clases base que <Input>, para los <select> que el
// componente Input (solo <input>) no cubre.
const selectCls =
  'w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50';
