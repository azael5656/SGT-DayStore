import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandCoins, Phone, Mail } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import ClienteForm from '../components/ClienteForm';
import type { Customer } from '../types';
import { pedirConfirmacionYDesactivar } from '../utils/clienteActions';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import Input from '../components/ui/Input';
import PageHeader from '../components/ui/PageHeader';
import { useConfirm } from '../components/ui/ConfirmProvider';

type FiltroEstado = 'activos' | 'inactivos' | 'todos';
const FILTROS: { value: FiltroEstado; label: string }[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

/**
 * Página de Clientes / Deudores.
 *
 * Solo accesible para admin/superadmin. Permite buscar, filtrar por
 * estado (Activos/Inactivos/Todos) y crear clientes. El click en una
 * fila abre la pantalla de detalle (`/clientes/:id`) con el historial
 * completo, donde se puede editar, desactivar y reactivar.
 */
export default function ClientesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';

  const [items, setItems] = useState<Customer[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('activos');
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const params: Record<string, string> = {};
      if (busqueda) params.q = busqueda;
      if (filtro !== 'activos') params.incluirInactivos = 'true';
      const { data } = await api.get<Customer[]>('/api/negocio/customers', {
        params,
      });
      setItems(data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const visibles = useMemo(() => {
    if (filtro === 'inactivos') return items.filter((c) => !c.activo);
    return items;
  }, [items, filtro]);

  const onDesactivar = (c: Customer) => {
    void pedirConfirmacionYDesactivar(
      { id: c.id, nombre: c.nombre },
      confirm,
      () => {
        void cargar();
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Clientes / Deudores"
        icon={<HandCoins size={22} strokeWidth={1.75} />}
        actions={
          puedeEditar && (
            <Button onClick={() => setCreando(true)}>+ Nuevo cliente</Button>
          )
        }
      />

      <div className="flex gap-2 mb-3">
        {FILTROS.map((f) => (
          <Chip
            key={f.value}
            active={filtro === f.value}
            onClick={() => setFiltro(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar por cédula o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cargar()}
          />
        </div>
        <Button variant="secondary" onClick={cargar}>
          Buscar
        </Button>
      </div>

      <Table className="min-w-[680px]">
        <THead>
          <tr>
            <TH>Cédula</TH>
            <TH>Nombre</TH>
            <TH>
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} strokeWidth={1.75} />
                Teléfono
              </span>
            </TH>
            <TH>
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} strokeWidth={1.75} />
                Email
              </span>
            </TH>
            <TH>Estado</TH>
            {puedeEditar && <TH></TH>}
          </tr>
        </THead>
        <TBody>
          {cargando && (
            <tr>
              <TD colSpan={6} className="py-6 text-center text-text-muted">
                Cargando...
              </TD>
            </tr>
          )}
          {!cargando && visibles.length === 0 && (
            <tr>
              <TD colSpan={6} className="py-6 text-center text-text-muted">
                Sin clientes para este filtro.
              </TD>
            </tr>
          )}
          {visibles.map((c) => (
            <TR
              key={c.id}
              className={`cursor-pointer ${!c.activo ? 'opacity-70' : ''}`}
              onClick={() => navigate(`/clientes/${c.id}`)}>
              <TD className="font-mono text-xs">{c.cedula}</TD>
              <TD className="font-medium">{c.nombre}</TD>
              <TD className="text-text-muted text-xs">{c.telefono ?? '—'}</TD>
              <TD className="text-text-muted text-xs">{c.email ?? '—'}</TD>
              <TD>
                {c.activo ? (
                  <Badge tone="success">ACTIVO</Badge>
                ) : (
                  <Badge tone="neutral">INACTIVO</Badge>
                )}
              </TD>
              {puedeEditar && (
                <TD
                  className="text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}>
                  {c.activo && (
                    <button
                      onClick={() => onDesactivar(c)}
                      className="text-danger text-xs hover:underline">
                      Desactivar
                    </button>
                  )}
                </TD>
              )}
            </TR>
          ))}
        </TBody>
      </Table>

      {creando && (
        <ClienteForm
          cliente={null}
          onCerrar={() => setCreando(false)}
          onGuardado={() => {
            setCreando(false);
            void cargar();
          }}
        />
      )}
    </div>
  );
}
