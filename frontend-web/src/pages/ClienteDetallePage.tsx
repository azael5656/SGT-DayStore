import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import ClienteForm from '../components/ClienteForm';
import type { AuditLog, Customer, Sale, SalePayment } from '../types';
import { pedirConfirmacionYDesactivar } from '../utils/clienteActions';

interface Resumen {
  deudaTotalUsd: string;
  ventasPendientes: number;
  ventasCompletadas: number;
  ventasAnuladas: number;
}

interface Historial {
  cliente: Customer;
  resumen: Resumen;
  ventas: Sale[];
  auditoria: AuditLog[];
}

type Tab = 'ventas' | 'abonos' | 'auditoria';

const ESTADO_CLS: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  completada: 'bg-green-100 text-green-700',
  anulada: 'bg-gray-200 text-gray-600',
};

const ACTION_LABEL: Record<string, string> = {
  'customer.create': 'Creó el cliente',
  'customer.update': 'Editó datos',
  'customer.deactivate': 'Desactivó el cliente',
  'customer.reactivate': 'Reactivó el cliente',
  'sale.cancelled-on-customer-deactivation': 'Anuló venta al desactivar',
};

/**
 * Página de detalle del cliente. Equivalente al `ClienteDetalleScreen`
 * de mobile. Muestra deuda total viva, ventas con sus abonos y la
 * auditoría filtrada por `resourceId`. Permite editar, desactivar
 * (con confirmación si tiene deudas) y reactivar.
 */
export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';

  const [historial, setHistorial] = useState<Historial | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<Tab>('ventas');
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');
  const [reactivando, setReactivando] = useState(false);

  const cargar = async () => {
    if (!id) return;
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get<Historial>(
        `/api/negocio/customers/${id}/historial`,
      );
      setHistorial(data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'No se pudo cargar el historial';
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onDesactivar = () => {
    if (!historial) return;
    void pedirConfirmacionYDesactivar(
      { id: historial.cliente.id, nombre: historial.cliente.nombre },
      () => {
        void cargar();
      },
    );
  };

  const onReactivar = async () => {
    if (!historial) return;
    setReactivando(true);
    try {
      await api.patch(`/api/negocio/customers/${historial.cliente.id}/activar`);
      await cargar();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'No se pudo reactivar';
      alert(msg);
    } finally {
      setReactivando(false);
    }
  };

  if (cargando) {
    return <div className="text-gray-500 text-sm">Cargando...</div>;
  }
  if (error) {
    return (
      <div>
        <Link to="/clientes" className="text-primary text-sm hover:underline">
          ← Volver a clientes
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mt-3">
          {error}
        </div>
      </div>
    );
  }
  if (!historial) return null;

  const { cliente, resumen, ventas, auditoria } = historial;
  const abonos = aplastarAbonos(ventas);
  const deuda = Number(resumen.deudaTotalUsd);

  return (
    <div className="space-y-4">
      <Link to="/clientes" className="text-primary text-sm hover:underline">
        ← Volver a clientes
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold break-words">{cliente.nombre}</h1>
          <div className="text-primary font-mono text-sm mt-1">{cliente.cedula}</div>
          {cliente.telefono && (
            <div className="text-gray-600 text-sm mt-2">📞 {cliente.telefono}</div>
          )}
          {cliente.email && (
            <div className="text-gray-600 text-sm">✉️ {cliente.email}</div>
          )}
          {cliente.notas && (
            <div className="text-gray-500 text-xs mt-2 italic">{cliente.notas}</div>
          )}
          {!cliente.activo && (
            <span className="inline-block mt-3 text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
              INACTIVO
            </span>
          )}
        </div>
        {puedeEditar && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => setEditando(true)}
              className="px-3 py-1.5 border border-primary text-primary rounded-md text-xs font-bold hover:bg-primary hover:text-white">
              Editar
            </button>
            {cliente.activo ? (
              <button
                onClick={onDesactivar}
                className="px-3 py-1.5 border border-red-300 text-red-700 rounded-md text-xs font-bold hover:bg-red-50">
                Desactivar
              </button>
            ) : (
              <button
                onClick={onReactivar}
                disabled={reactivando}
                className="px-3 py-1.5 bg-primary text-white rounded-md text-xs font-bold disabled:opacity-60">
                {reactivando ? 'Reactivando...' : 'Reactivar'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Deuda */}
      {deuda > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-md p-4">
          <div className="text-amber-900 font-bold text-lg">
            💰 Deuda total: ${resumen.deudaTotalUsd}
          </div>
          <div className="text-amber-800 text-sm">
            {resumen.ventasPendientes} venta(s) pendiente(s)
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Pendientes" valor={resumen.ventasPendientes} />
        <Kpi label="Completadas" valor={resumen.ventasCompletadas} />
        <Kpi label="Anuladas" valor={resumen.ventasAnuladas} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <TabBtn label={`Ventas (${ventas.length})`} active={tab === 'ventas'} onClick={() => setTab('ventas')} />
        <TabBtn label={`Abonos (${abonos.length})`} active={tab === 'abonos'} onClick={() => setTab('abonos')} />
        <TabBtn label={`Auditoría (${auditoria.length})`} active={tab === 'auditoria'} onClick={() => setTab('auditoria')} />
      </div>

      {tab === 'ventas' && <ListaVentas data={ventas} />}
      {tab === 'abonos' && <ListaAbonos data={abonos} />}
      {tab === 'auditoria' && <ListaAuditoria data={auditoria} />}

      {editando && (
        <ClienteForm
          cliente={cliente}
          onCerrar={() => setEditando(false)}
          onGuardado={(actualizado) => {
            setEditando(false);
            setHistorial((h) => (h ? { ...h, cliente: actualizado } : h));
            void cargar();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold">{valor}</div>
      <div className="text-xs uppercase font-bold text-gray-500 tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${
        active
          ? 'text-primary border-primary'
          : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}>
      {label}
    </button>
  );
}

function ListaVentas({ data }: { data: Sale[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-sm py-6 text-center">Sin ventas registradas.</p>;
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs uppercase text-gray-500">
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Total USD</th>
            <th className="px-3 py-2">Saldo USD</th>
            <th className="px-3 py-2">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-xs">
                {new Date(s.fecha).toLocaleDateString()}
              </td>
              <td className="px-3 py-2 text-xs capitalize">{s.tipoVenta}</td>
              <td className="px-3 py-2 font-medium">${s.total}</td>
              <td className="px-3 py-2">${s.saldoUsd}</td>
              <td className="px-3 py-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    ESTADO_CLS[s.estado] ?? 'bg-gray-100'
                  }`}>
                  {s.estado.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaAbonos({ data }: { data: SalePayment[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-sm py-6 text-center">Sin abonos registrados.</p>;
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm min-w-[520px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs uppercase text-gray-500">
            <th className="px-3 py-2">Monto original</th>
            <th className="px-3 py-2">Moneda</th>
            <th className="px-3 py-2">Método</th>
            <th className="px-3 py-2">USD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">{p.amountOriginal}</td>
              <td className="px-3 py-2 text-xs">{p.currency}</td>
              <td className="px-3 py-2 text-xs capitalize">{p.method}</td>
              <td className="px-3 py-2 font-medium">${p.amountUsd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaAuditoria({ data }: { data: AuditLog[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-sm py-6 text-center">Sin eventos.</p>;
  }
  return (
    <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
      {data.map((a) => (
        <li key={a.id} className="px-4 py-3">
          <div className="font-medium text-sm">
            {ACTION_LABEL[a.action] ?? a.action}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(a.createdAt).toLocaleString()} ·{' '}
            {a.userEmail ?? 'sistema'}
          </div>
        </li>
      ))}
    </ul>
  );
}

function aplastarAbonos(ventas: Sale[]): SalePayment[] {
  const abonos: SalePayment[] = [];
  for (const v of ventas) {
    if (v.payments) abonos.push(...v.payments);
  }
  abonos.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return abonos;
}
