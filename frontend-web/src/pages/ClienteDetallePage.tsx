import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Pencil, Phone } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import ClienteForm from '../components/ClienteForm';
import type { AuditLog, Customer, Sale, SalePayment } from '../types';
import { pedirConfirmacionYDesactivar } from '../utils/clienteActions';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import Tabs from '../components/ui/Tabs';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { ESTADO_VARIANT, type Tone } from '../components/ui/variants';
import { useConfirm } from '../components/ui/ConfirmProvider';

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

// Tono del badge por estado de venta. Usa el mapa central de variants y
// agrega `completada` (no presente en ESTADO_VARIANT) como exito.
const ESTADO_TONE: Record<string, Tone> = {
  completada: 'success',
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
  const confirm = useConfirm();
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
      confirm,
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
    return <div className="text-text-muted text-sm">Cargando...</div>;
  }
  if (error) {
    return (
      <div className="space-y-3">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1 text-accent text-sm hover:underline">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Volver a clientes
        </Link>
        <Alert tone="danger">{error}</Alert>
      </div>
    );
  }
  if (!historial) return null;

  const { cliente, resumen, ventas, auditoria } = historial;
  const abonos = aplastarAbonos(ventas);
  const deuda = Number(resumen.deudaTotalUsd);

  return (
    <div className="space-y-4">
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1 text-accent text-sm hover:underline">
        <ArrowLeft size={16} strokeWidth={1.75} />
        Volver a clientes
      </Link>

      {/* Header */}
      <Card className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl font-extrabold text-text break-words">{cliente.nombre}</h1>
          <div className="text-accent font-mono text-sm mt-1">{cliente.cedula}</div>
          {cliente.telefono && (
            <div className="flex items-center gap-1.5 text-text-muted text-sm mt-2">
              <Phone size={14} strokeWidth={1.75} /> {cliente.telefono}
            </div>
          )}
          {cliente.email && (
            <div className="flex items-center gap-1.5 text-text-muted text-sm">
              <Mail size={14} strokeWidth={1.75} /> {cliente.email}
            </div>
          )}
          {cliente.notas && (
            <div className="text-text-muted text-xs mt-2 italic">{cliente.notas}</div>
          )}
          {!cliente.activo && (
            <span className="inline-block mt-3">
              <Badge tone="neutral">INACTIVO</Badge>
            </span>
          )}
        </div>
        {puedeEditar && (
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditando(true)}
              leftIcon={<Pencil size={14} strokeWidth={1.75} />}>
              Editar
            </Button>
            {cliente.activo ? (
              <Button variant="danger" size="sm" onClick={onDesactivar}>
                Desactivar
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onReactivar}
                disabled={reactivando}>
                {reactivando ? 'Reactivando...' : 'Reactivar'}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Deuda */}
      {deuda > 0 && (
        <Alert tone="warning" title={`Deuda total: $${resumen.deudaTotalUsd}`}>
          {resumen.ventasPendientes} venta(s) pendiente(s)
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Pendientes" valor={resumen.ventasPendientes} />
        <Kpi label="Completadas" valor={resumen.ventasCompletadas} />
        <Kpi label="Anuladas" valor={resumen.ventasAnuladas} />
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        items={[
          { id: 'ventas', label: `Ventas (${ventas.length})` },
          { id: 'abonos', label: `Abonos (${abonos.length})` },
          { id: 'auditoria', label: `Auditoría (${auditoria.length})` },
        ]}
      />

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
  return <KpiCard label={label} value={valor} />;
}

function ListaVentas({ data }: { data: Sale[] }) {
  if (data.length === 0) {
    return <p className="text-text-muted text-sm py-6 text-center">Sin ventas registradas.</p>;
  }
  return (
    <Table className="min-w-[640px]">
      <THead>
        <tr>
          <TH>Fecha</TH>
          <TH>Tipo</TH>
          <TH>Total USD</TH>
          <TH>Saldo USD</TH>
          <TH>Estado</TH>
        </tr>
      </THead>
      <TBody>
        {data.map((s) => (
          <TR key={s.id}>
            <TD className="text-xs">
              {new Date(s.fecha).toLocaleDateString()}
            </TD>
            <TD className="text-xs capitalize">{s.tipoVenta}</TD>
            <TD className="font-medium">${s.total}</TD>
            <TD>${s.saldoUsd}</TD>
            <TD>
              <Badge
                tone={
                  ESTADO_TONE[s.estado] ??
                  ESTADO_VARIANT[s.estado.toLowerCase()] ??
                  'neutral'
                }>
                {s.estado.toUpperCase()}
              </Badge>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function ListaAbonos({ data }: { data: SalePayment[] }) {
  if (data.length === 0) {
    return <p className="text-text-muted text-sm py-6 text-center">Sin abonos registrados.</p>;
  }
  return (
    <Table className="min-w-[520px]">
      <THead>
        <tr>
          <TH>Monto original</TH>
          <TH>Moneda</TH>
          <TH>Método</TH>
          <TH>USD</TH>
        </tr>
      </THead>
      <TBody>
        {data.map((p) => (
          <TR key={p.id}>
            <TD>{p.amountOriginal}</TD>
            <TD className="text-xs">{p.currency}</TD>
            <TD className="text-xs capitalize">{p.method}</TD>
            <TD className="font-medium">${p.amountUsd}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function ListaAuditoria({ data }: { data: AuditLog[] }) {
  if (data.length === 0) {
    return <p className="text-text-muted text-sm py-6 text-center">Sin eventos.</p>;
  }
  return (
    <ul className="bg-surface border border-border rounded-2xl divide-y divide-border">
      {data.map((a) => (
        <li key={a.id} className="px-4 py-3">
          <div className="font-medium text-sm text-text">
            {ACTION_LABEL[a.action] ?? a.action}
          </div>
          <div className="text-xs text-text-muted mt-1">
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
