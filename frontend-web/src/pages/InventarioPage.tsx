import { FormEvent, useEffect, useState } from 'react';
import { Package, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Categoria, Page, Producto } from '../types';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useConfirm } from '../components/ui/ConfirmProvider';
import PageHeader from '../components/ui/PageHeader';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';

export default function InventarioPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';
  const [items, setItems] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Producto | null>(null);
  const [creando, setCreando] = useState(false);
  const [catsAbierto, setCatsAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [prodResp, catResp] = await Promise.all([
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
    const ok = await confirm({
      title: 'Borrar producto',
      message: '¿Borrar este producto? Esta accion no se puede deshacer.',
      danger: true,
      confirmText: 'Borrar',
    });
    if (!ok) return;
    await api.delete(`/api/negocio/products/${id}`);
    cargar();
  };

  return (
    <div>
      <PageHeader
        title="Inventario"
        icon={<Package size={22} strokeWidth={1.75} />}
        actions={
          puedeEditar && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                leftIcon={<Tags size={16} strokeWidth={1.75} />}
                onClick={() => setCatsAbierto(true)}>
                Categorías
              </Button>
              <Button leftIcon={<Plus size={16} strokeWidth={1.75} />} onClick={() => setCreando(true)}>
                Nuevo producto
              </Button>
            </div>
          )
        }
      />

      <div className="flex gap-2 mb-4 max-w-xl">
        <Input
          type="text"
          placeholder="Buscar por nombre o codigo (ej. JOY)…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
          className="flex-1"
        />
        <Button variant="secondary" onClick={cargar}>
          Buscar
        </Button>
      </div>

      <Table className="min-w-[720px]">
        <THead>
          <TR>
            <TH>Nombre</TH>
            <TH>Categoria</TH>
            <TH className="text-right">Precio</TH>
            <TH className="text-right">Stock</TH>
            <TH>Codigo</TH>
            {puedeEditar && <TH></TH>}
          </TR>
        </THead>
        <TBody>
          {cargando && (
            <TR>
              <TD colSpan={6} className="py-8 text-center text-text-muted">
                Cargando…
              </TD>
            </TR>
          )}
          {!cargando && items.length === 0 && (
            <TR>
              <TD colSpan={6} className="py-8 text-center text-text-muted">
                Sin productos.
              </TD>
            </TR>
          )}
          {items.map((p) => {
            const agotado = p.stock <= 0;
            const bajo = !agotado && p.stock <= p.stockMinimo;
            const stockColor = agotado ? 'text-danger' : bajo ? 'text-warning' : 'text-text';
            return (
              <TR key={p.id}>
                <TD className="font-medium">{p.nombre}</TD>
                <TD>
                  <span className="text-text-muted">{p.category?.nombre ?? '—'}</span>
                </TD>
                <TD className="text-right tabular-nums">${Number(p.precio).toLocaleString()}</TD>
                <TD className="text-right">
                  <span className={`font-bold tabular-nums ${stockColor}`}>{p.stock}</span>
                  {(agotado || bajo) && (
                    <span className={`block text-[10px] uppercase tracking-wide ${stockColor}`}>
                      {agotado ? 'Agotado' : 'Bajo'}
                    </span>
                  )}
                </TD>
                <TD className="text-text-muted text-xs font-mono">{p.codigo ?? ''}</TD>
                {puedeEditar && (
                  <TD className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" leftIcon={<Pencil size={14} strokeWidth={1.75} />} onClick={() => setEditando(p)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} strokeWidth={1.75} />} onClick={() => eliminar(p.id)}>
                        Borrar
                      </Button>
                    </div>
                  </TD>
                )}
              </TR>
            );
          })}
        </TBody>
      </Table>

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

      {catsAbierto && (
        <CategoriasModal
          categorias={categorias}
          onClose={() => setCatsAbierto(false)}
          onChanged={cargar}
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
      // Nunca permitimos negativos: aunque tecleen "-4", se guarda como 0.
      const payload = {
        nombre,
        categoryId,
        precio: Math.max(0, Number(precio) || 0),
        stock: Math.max(0, Number(stock) || 0),
        stockMinimo: Math.max(0, Number(stockMinimo) || 0),
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
    <Modal open onClose={onCerrar} title={producto ? 'Editar producto' : 'Nuevo producto'}>
      <form onSubmit={submit}>
        {error && (
          <div className="mb-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}
        <div className="space-y-3">
          <Field label="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Field>
          <Field label="Categoria">
            <select className={selectCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Precio">
                <Input type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Stock">
                <Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} required />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Stock min.">
                <Input type="number" min={0} value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
              </Field>
            </div>
          </div>
          <Field label="Codigo">
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface CatsProps {
  categorias: Categoria[];
  onClose: () => void;
  onChanged: () => void;
}

/** Gestión de categorías (CRUD sobre /api/negocio/categories). */
function CategoriasModal({ categorias, onClose, onChanged }: CatsProps) {
  const confirm = useConfirm();
  const [nuevo, setNuevo] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [error, setError] = useState('');

  const errMsg = (err: unknown) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
    'No se pudo guardar';

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setError('');
    try {
      await api.post('/api/negocio/categories', { nombre: nuevo.trim() });
      setNuevo('');
      onChanged();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const guardar = async (id: string) => {
    if (!editNombre.trim()) return;
    setError('');
    try {
      await api.put(`/api/negocio/categories/${id}`, { nombre: editNombre.trim() });
      setEditId(null);
      onChanged();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const borrar = async (c: Categoria) => {
    const ok = await confirm({
      title: 'Borrar categoría',
      message: `¿Borrar "${c.nombre}"? Los productos de esta categoría podrían quedar sin clasificar.`,
      danger: true,
      confirmText: 'Borrar',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/api/negocio/categories/${c.id}`);
      onChanged();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <Modal open onClose={onClose} title="Categorías" maxWidth="sm">
      {error && (
        <div className="mb-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <form onSubmit={crear} className="flex gap-2 mb-4">
        <Input
          placeholder="Nueva categoría"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" leftIcon={<Plus size={16} strokeWidth={1.75} />}>
          Agregar
        </Button>
      </form>

      <div className="space-y-1.5 max-h-72 overflow-auto">
        {categorias.length === 0 && (
          <div className="text-sm text-text-muted py-4 text-center">Sin categorías aún.</div>
        )}
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center gap-2 bg-surface-alt rounded-xl px-3 py-2">
            {editId === c.id ? (
              <>
                <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="flex-1" autoFocus />
                <Button size="sm" onClick={() => guardar(c.id)}>Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancelar</Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-text">{c.nombre}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Pencil size={14} strokeWidth={1.75} />}
                  onClick={() => {
                    setEditId(c.id);
                    setEditNombre(c.nombre);
                  }}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} strokeWidth={1.75} />} onClick={() => borrar(c)}>
                  Borrar
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

const selectCls =
  'w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
