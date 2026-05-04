import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import ClienteForm from '../components/ClienteForm';
import type { Customer } from '../types';
import { pedirConfirmacionYDesactivar } from '../utils/clienteActions';

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
      () => {
        void cargar();
      },
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Clientes / Deudores</h1>
        {puedeEditar && (
          <button
            onClick={() => setCreando(true)}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold">
            + Nuevo cliente
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
              filtro === f.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por cédula o nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={cargar} className="px-4 py-2 bg-gray-100 rounded-md text-sm">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Cédula</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Estado</th>
              {puedeEditar && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Sin clientes para este filtro.
                </td>
              </tr>
            )}
            {visibles.map((c) => (
              <tr
                key={c.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  !c.activo ? 'opacity-70' : ''
                }`}
                onClick={() => navigate(`/clientes/${c.id}`)}>
                <td className="px-3 py-2 font-mono text-xs">{c.cedula}</td>
                <td className="px-3 py-2 font-medium">{c.nombre}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">
                  {c.telefono ?? '—'}
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs">
                  {c.email ?? '—'}
                </td>
                <td className="px-3 py-2">
                  {c.activo ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                      ACTIVO
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                      INACTIVO
                    </span>
                  )}
                </td>
                {puedeEditar && (
                  <td
                    className="px-3 py-2 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}>
                    {c.activo && (
                      <button
                        onClick={() => onDesactivar(c)}
                        className="text-red-600 text-xs hover:underline">
                        Desactivar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
