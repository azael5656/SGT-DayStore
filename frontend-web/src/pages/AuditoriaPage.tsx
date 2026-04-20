import { useEffect, useState } from 'react';
import api from '../api/client';
import type { AuditLog, Page } from '../types';

const ACCIONES = [
  { label: 'Todo', value: '' },
  { label: 'Login', value: 'auth.login' },
  { label: 'Productos', value: 'products' },
  { label: 'Categorias', value: 'categories' },
  { label: 'Alertas', value: 'alert' },
  { label: 'Escenarios IoT', value: 'scenario' },
];

const colorAccion = (a: string) => {
  if (a.includes('login')) return 'bg-cyan-100 text-cyan-700';
  if (a.includes('delete')) return 'bg-red-100 text-red-700';
  if (a.includes('create')) return 'bg-green-100 text-green-700';
  if (a.includes('update')) return 'bg-yellow-100 text-yellow-700';
  if (a.includes('alert')) return 'bg-orange-100 text-orange-700';
  if (a.includes('scenario')) return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
};

export default function AuditoriaPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroEmail, setFiltroEmail] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await api.get<Page<AuditLog>>('/api/negocio/audit/logs', {
        params: {
          action: filtroAccion || undefined,
          userEmail: filtroEmail || undefined,
          page,
          limit,
        },
      });
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroAccion, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <span className="text-sm text-gray-500">{total} eventos</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {ACCIONES.map((c) => (
          <button
            key={c.value}
            onClick={() => {
              setFiltroAccion(c.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              filtroAccion === c.value
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={filtroEmail}
          onChange={(e) => setFiltroEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), cargar())}
          placeholder="Filtrar por email..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button onClick={() => (setPage(1), cargar())} className="px-4 py-2 bg-gray-100 rounded-md text-sm">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Cuando</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Accion</th>
              <th className="px-3 py-2">Recurso</th>
              <th className="px-3 py-2">IP</th>
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
                  Sin eventos.
                </td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {new Date(it.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{it.userEmail ?? <em className="text-gray-400">sistema</em>}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{it.userRole ?? '-'}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${colorAccion(it.action)}`}>
                    {it.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">
                  {it.resource ?? '-'}
                  {it.resourceId ? `/${it.resourceId.slice(0, 12)}` : ''}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{it.ip ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 text-sm">
        <span className="text-gray-500">
          Pagina {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded-md disabled:opacity-50">
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded-md disabled:opacity-50">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
