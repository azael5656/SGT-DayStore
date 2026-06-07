import { FormEvent, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Categoria, Page, Producto } from '../types';

export default function InventarioPage() {
  const { user } = useAuth();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';
  const [items, setItems] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Producto | null>(null);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [prodResp, catResp] = await Promise.all([
        // El backend acepta solo `search` (no `busqueda`) y NO acepta
        // `limit` (whitelist + forbidNonWhitelisted en ValidationPipe).
        api.get<Page<Producto> | Producto[]>('/api/negocio/products', {
          params: busqueda ? { search: busqueda } : {},
        }),
        api.get<Categoria[]>('/api/negocio/categories'),
      ]);
      setItems(Array.isArray(prodResp.data) ? prodResp.data : prodResp.data.items ?? []);
      setCategorias(catResp.data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eliminar = async (id: string) => {
    if (!confirm('¿Borrar este producto?')) return;
    await api.delete(`/api/negocio/products/${id}`);
    cargar();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Inventario</h1>
        {puedeEditar && (
          <button
            onClick={() => setCreando(true)}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold">
            + Nuevo producto
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o codigo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button onClick={cargar} className="px-4 py-2 bg-gray-100 rounded-md text-sm">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2 text-right">Precio</th>
              <th className="px-3 py-2 text-right">Stock</th>
              <th className="px-3 py-2">Codigo</th>
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
                  Sin productos.
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{p.nombre}</td>
                <td className="px-3 py-2 text-gray-600">{p.category?.nombre ?? '—'}</td>
                <td className="px-3 py-2 text-right">${Number(p.precio).toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-semibold ${p.stock <= p.stockMinimo ? 'text-red-600' : ''}`}>
                  {p.stock}
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{p.codigo ?? ''}</td>
                {puedeEditar && (
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setEditando(p)}
                      className="text-primary text-xs mr-3 hover:underline">
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(p.id)}
                      className="text-red-600 text-xs hover:underline">
                      Borrar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creando || editando) && (
        <ProductoForm
          producto={editando}
          categorias={categorias}
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

interface FormProps {
  producto: Producto | null;
  categorias: Categoria[];
  onCerrar: () => void;
  onGuardado: () => void;
}

function ProductoForm({ producto, categorias, onCerrar, onGuardado }: FormProps) {
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [categoryId, setCategoryId] = useState(producto?.category?.id ?? categorias[0]?.id ?? '');
  const [precio, setPrecio] = useState(String(producto?.precio ?? ''));
  const [stock, setStock] = useState(String(producto?.stock ?? '0'));
  const [stockMinimo, setStockMinimo] = useState(String(producto?.stockMinimo ?? '5'));
  const [codigo, setCodigo] = useState(producto?.codigo ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = {
        nombre,
        categoryId,
        precio: Number(precio),
        stock: Number(stock),
        stockMinimo: Number(stockMinimo),
        codigo: codigo || undefined,
      };
      if (producto) {
        await api.put(`/api/negocio/products/${producto.id}`, payload);
      } else {
        await api.post('/api/negocio/products', payload);
      }
      onGuardado();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Error guardando',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold mb-4">
          {producto ? 'Editar producto' : 'Nuevo producto'}
        </h3>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <Field label="Nombre">
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Field>
          <Field label="Categoria">
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2">
            <Field label="Precio">
              <input className={inputCls} type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
            </Field>
            <Field label="Stock">
              <input className={inputCls} type="number" value={stock} onChange={(e) => setStock(e.target.value)} required />
            </Field>
            <Field label="Stock min.">
              <input className={inputCls} type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
            </Field>
          </div>
          <Field label="Codigo">
            <input className={inputCls} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-60">
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
    <label className="block flex-1">
      <span className="text-xs text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
