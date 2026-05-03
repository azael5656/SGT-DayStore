import { FormEvent, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Customer } from '../types';

/**
 * Página de Clientes / Deudores.
 *
 * Solo accesible para admin/superadmin. Permite buscar por cédula o
 * nombre, crear, editar y desactivar (soft-delete) clientes.
 *
 * Las ventas a crédito se asocian a un cliente registrado aquí. Las
 * ventas de contado anónimas no requieren registrarlo.
 */
export default function ClientesPage() {
  const { user } = useAuth();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';

  const [items, setItems] = useState<Customer[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Customer | null>(null);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await api.get<Customer[]>('/api/negocio/customers', {
        params: busqueda ? { q: busqueda } : {},
      });
      setItems(data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const desactivar = async (c: Customer) => {
    if (!confirm(`Desactivar cliente ${c.nombre}?`)) return;
    await api.delete(`/api/negocio/customers/${c.id}`);
    cargar();
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
            {!cargando && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Sin clientes registrados.
                </td>
              </tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
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
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditando(c)}
                      className="text-primary text-xs mr-3 hover:underline">
                      Editar
                    </button>
                    {c.activo && (
                      <button
                        onClick={() => desactivar(c)}
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

      {(creando || editando) && (
        <ClienteForm
          cliente={editando}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={() => {
            setCreando(false);
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ClienteForm({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente: Customer | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [cedula, setCedula] = useState(cliente?.cedula ?? '');
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [notas, setNotas] = useState(cliente?.notas ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = {
        cedula,
        nombre,
        telefono: telefono || undefined,
        email: email || undefined,
        notas: notas || undefined,
      };
      if (cliente) {
        await api.patch(`/api/negocio/customers/${cliente.id}`, payload);
      } else {
        await api.post('/api/negocio/customers', payload);
      }
      onGuardado();
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
        <h3 className="text-lg font-bold mb-4">
          {cliente ? 'Editar cliente' : 'Nuevo cliente'}
        </h3>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <Field label="Cédula *">
            <input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="V-12345678"
              className={inputCls}
              required
            />
          </Field>
          <Field label="Nombre *">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Teléfono">
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="04141234567"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className={inputCls + ' min-h-[60px]'}
              maxLength={500}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-60">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
