import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  COMBINACIONES_VALIDAS,
  type Currency,
  type CurrentRates,
  type Customer,
  type EstadoVenta,
  type Page,
  type PaymentMethod,
  type Producto,
  type Sale,
  type TipoVenta,
} from '../types';
import { downloadPdf } from '../utils/downloadPdf';

/**
 * Página de Ventas multi-moneda.
 *
 * - Lista de ventas (con filtros + paginación).
 * - Crear venta: carrito de productos + array de pagos en USD/VES/COP.
 * - Detalle: muestra items y desglose de pagos (con tasa congelada).
 * - Reportes (admin): agregaciones diarias y mensuales en USD.
 *
 * Todos los precios se almacenan en USD. Las conversiones se calculan
 * en vivo usando GET /exchange-rates/current.
 */
export default function VentasPage() {
  const { user } = useAuth();
  const esGerencia = user?.role === 'admin' || user?.role === 'superadmin';
  const esSuperadmin = user?.role === 'superadmin';

  const [tab, setTab] = useState<'lista' | 'reportes'>('lista');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Ventas</h1>
      </div>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <TabButton active={tab === 'lista'} onClick={() => setTab('lista')}>
          📋 Lista
        </TabButton>
        {esGerencia && (
          <TabButton
            active={tab === 'reportes'}
            onClick={() => setTab('reportes')}>
            📊 Reportes
          </TabButton>
        )}
      </div>

      {tab === 'lista' && (
        <ListaVentas esGerencia={esGerencia} esSuperadmin={esSuperadmin} />
      )}
      {tab === 'reportes' && esGerencia && <ReportesVentas />}
    </div>
  );
}

// ============================================================================
// LISTA
// ============================================================================

function ListaVentas({
  esGerencia,
  esSuperadmin,
}: {
  esGerencia: boolean;
  esSuperadmin: boolean;
}) {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState<EstadoVenta | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [verDetalle, setVerDetalle] = useState<Sale | null>(null);
  const [anulando, setAnulando] = useState<Sale | null>(null);
  const [abonando, setAbonando] = useState<Sale | null>(null);

  const cargar = async (paginaNueva = page) => {
    setCargando(true);
    try {
      const params: Record<string, string | number> = {
        page: paginaNueva,
        limit,
      };
      if (estado) params.estado = estado;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (incluirAnuladas) params.incluirAnuladas = 'true';
      const { data } = await api.get<Page<Sale>>('/api/negocio/sales', {
        params,
      });
      setVentas(data.items);
      setTotal(data.total);
      setPage(data.page);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, desde, hasta, incluirAnuladas]);

  const softDelete = async (s: Sale) => {
    if (!confirm(`Soft-delete venta ${s.id.slice(0, 8)}?`)) return;
    await api.delete(`/api/negocio/sales/${s.id}`);
    cargar(page);
  };

  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const descargarHistorialPdf = async () => {
    setDescargandoPdf(true);
    try {
      await downloadPdf(
        '/api/negocio/sales/reports/historial.pdf',
        {
          estado: estado || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          incluirAnuladas: incluirAnuladas ? 'true' : undefined,
        },
        'historial-ventas.pdf',
      );
    } catch (err) {
      alert('No se pudo generar el PDF. Revisa la consola.');
      console.error(err);
    } finally {
      setDescargandoPdf(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Field label="Estado">
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoVenta | '')}
            className={inputCls}>
            <option value="">Todas</option>
            <option value="completada">Completadas</option>
            <option value="pendiente">Pendientes (deudas)</option>
            <option value="anulada">Anuladas</option>
          </select>
        </Field>
        <Field label="Desde">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={inputCls}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input
            type="checkbox"
            checked={incluirAnuladas}
            onChange={(e) => setIncluirAnuladas(e.target.checked)}
          />
          Incluir anuladas
        </label>
        <div className="flex-1" />
        <button
          onClick={descargarHistorialPdf}
          disabled={descargandoPdf}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
          {descargandoPdf ? 'Generando…' : '📄 Descargar PDF'}
        </button>
        <button
          onClick={() => setCrearAbierto(true)}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold">
          + Nueva venta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && ventas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Sin ventas en este filtro.
                </td>
              </tr>
            )}
            {ventas.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600">
                  {new Date(s.fecha).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {s.customer ? (
                    <>
                      <div className="font-medium">{s.customer.nombre}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {s.customer.cedula}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {s.tipoVenta === 'credito' ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      💳 CRÉDITO
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-800">
                      💵 CONTADO
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  ${Number(s.total).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(s.saldoUsd) > 0.01 ? (
                    <span className="font-bold text-amber-700">
                      ${Number(s.saldoUsd).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <EstadoBadge estado={s.estado} activo={s.activo} />
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => setVerDetalle(s)}
                    className="text-primary text-xs mr-3 hover:underline">
                    Ver
                  </button>
                  {s.estado === 'pendiente' && s.activo && (
                    <button
                      onClick={() => setAbonando(s)}
                      className="text-green-700 text-xs mr-3 hover:underline font-bold">
                      💰 Abonar
                    </button>
                  )}
                  {esGerencia &&
                    s.estado !== 'anulada' &&
                    s.activo && (
                      <button
                        onClick={() => setAnulando(s)}
                        className="text-amber-600 text-xs mr-3 hover:underline">
                        Anular
                      </button>
                    )}
                  {esSuperadmin && s.activo && (
                    <button
                      onClick={() => softDelete(s)}
                      className="text-red-600 text-xs hover:underline">
                      Borrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="flex justify-between items-center mt-3 text-sm">
          <span className="text-gray-500">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => cargar(page - 1)}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40">
              ← Anterior
            </button>
            <span className="px-2 py-1">
              {page} / {totalPaginas}
            </span>
            <button
              disabled={page >= totalPaginas}
              onClick={() => cargar(page + 1)}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {crearAbierto && (
        <CrearVentaForm
          onCerrar={() => setCrearAbierto(false)}
          onCreada={() => {
            setCrearAbierto(false);
            cargar(1);
          }}
        />
      )}
      {verDetalle && (
        <DetalleVenta venta={verDetalle} onCerrar={() => setVerDetalle(null)} />
      )}
      {anulando && (
        <AnularVentaForm
          venta={anulando}
          onCerrar={() => setAnulando(null)}
          onAnulada={() => {
            setAnulando(null);
            cargar(page);
          }}
        />
      )}
      {abonando && (
        <RegistrarAbonoForm
          venta={abonando}
          onCerrar={() => setAbonando(null)}
          onAbonado={() => {
            setAbonando(null);
            cargar(page);
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// CREAR VENTA (multi-pago)
// ============================================================================

interface ItemBorrador {
  productId: string;
  nombre: string;
  precioUsd: number;
  stockDisponible: number;
  cantidad: number;
}

interface PagoBorrador {
  id: string;
  currency: Currency;
  method: PaymentMethod;
  amount: string;
}

/**
 * Convierte un monto en `currency` a USD usando las tasas vigentes.
 * Para USD devuelve el mismo monto. Si no hay tasa para VES/COP, 0.
 */
function toUsd(monto: number, currency: Currency, tasas: CurrentRates | null): number {
  if (!Number.isFinite(monto) || monto <= 0) return 0;
  if (currency === 'USD') return monto;
  const rate = currency === 'VES' ? tasas?.VES : tasas?.COP;
  if (!rate) return 0;
  return monto / rate;
}

/** Convierte USD a `currency`. Devuelve null si no hay tasa. */
function fromUsd(usd: number, currency: Currency, tasas: CurrentRates | null): number | null {
  if (currency === 'USD') return usd;
  const rate = currency === 'VES' ? tasas?.VES : tasas?.COP;
  if (!rate) return null;
  return usd * rate;
}

function CrearVentaForm({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void;
  onCreada: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [items, setItems] = useState<ItemBorrador[]>([]);
  const [pagos, setPagos] = useState<PagoBorrador[]>([]);
  const [tasas, setTasas] = useState<CurrentRates | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Crédito / contado + cliente seleccionado
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>('contado');
  const [cliente, setCliente] = useState<Customer | null>(null);
  const [notas, setNotas] = useState('');

  useEffect(() => {
    Promise.all([
      // El endpoint products no acepta `limit` en query (whitelist
      // estricta del ValidationPipe). Devuelve todos los activos.
      api.get<Producto[] | Page<Producto>>('/api/negocio/products'),
      api.get<CurrentRates>('/api/negocio/exchange-rates/current'),
    ]).then(([prods, rates]) => {
      const lista = Array.isArray(prods.data) ? prods.data : prods.data.items;
      setProductos(lista.filter((p) => p.activo && p.stock > 0));
      setTasas(rates.data);
    });
  }, []);

  const totalUsd = useMemo(
    () => items.reduce((acc, i) => acc + i.precioUsd * i.cantidad, 0),
    [items],
  );

  const sumaPagosUsd = useMemo(
    () =>
      pagos.reduce((acc, p) => acc + toUsd(Number(p.amount), p.currency, tasas), 0),
    [pagos, tasas],
  );
  const diferencia = totalUsd - sumaPagosUsd;
  // Reglas de cuadre:
  //  - Contado: la suma de pagos = total (±0.01).
  //  - Crédito: la suma de pagos NO puede superar el total. Puede ser
  //    parcial (queda saldo) o cero (todo fiado).
  const cuadra =
    totalUsd > 0 &&
    (tipoVenta === 'contado'
      ? Math.abs(diferencia) <= 0.01
      : sumaPagosUsd <= totalUsd + 0.01);
  const saldoUsd = Math.max(0, totalUsd - sumaPagosUsd);

  const filtrados = productos
    .filter(
      (p) =>
        !busqueda ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase()),
    )
    .filter((p) => !items.some((i) => i.productId === p.id));

  const agregarProducto = (p: Producto) => {
    setItems([
      ...items,
      {
        productId: p.id,
        nombre: p.nombre,
        precioUsd: Number(p.precio),
        stockDisponible: p.stock,
        cantidad: 1,
      },
    ]);
  };

  const cambiarCantidad = (productId: string, cantidad: number) => {
    setItems(
      items.map((i) =>
        i.productId === productId
          ? { ...i, cantidad: Math.max(1, Math.min(i.stockDisponible, cantidad)) }
          : i,
      ),
    );
  };

  /**
   * Avanza al paso 2 y pre-llena UN pago con el total completo en USD —
   * el caso 90% del tiempo. El vendedor solo cambia moneda/método si
   * quiere y listo.
   */
  const irAPagos = () => {
    if (items.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }
    setError('');
    if (pagos.length === 0) {
      setPagos([
        {
          id: crypto.randomUUID(),
          currency: 'USD',
          method: 'efectivo',
          amount: totalUsd.toFixed(2),
        },
      ]);
    }
    setPaso(2);
  };

  /**
   * Cuando el usuario cambia algo en un pago. Si cambia la moneda, el
   * monto se ajusta automáticamente al equivalente en la nueva moneda
   * — sin necesidad de cuentas mentales.
   */
  const updatePago = (id: string, patch: Partial<PagoBorrador>) => {
    setPagos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...patch };

        if (patch.currency && patch.currency !== p.currency) {
          // Ajustar método si la combinación nueva quedó inválida.
          const validos = COMBINACIONES_VALIDAS[patch.currency];
          if (!validos.includes(merged.method)) merged.method = validos[0];

          // Auto-llenado: convertir el monto previo a la nueva moneda.
          // Si no había monto, usar el faltante para cuadrar.
          const montoPrevioUsd = toUsd(Number(p.amount), p.currency, tasas);
          let usdObjetivo = montoPrevioUsd;
          if (usdObjetivo <= 0) {
            const otrosUsd = prev
              .filter((x) => x.id !== id)
              .reduce((a, x) => a + toUsd(Number(x.amount), x.currency, tasas), 0);
            usdObjetivo = Math.max(0, totalUsd - otrosUsd);
          }
          const nuevoMonto = fromUsd(usdObjetivo, patch.currency, tasas);
          if (nuevoMonto !== null) merged.amount = nuevoMonto.toFixed(2);
        }
        return merged;
      }),
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (tipoVenta === 'credito' && !cliente) {
      setError('Las ventas a crédito requieren elegir un cliente con cédula');
      return;
    }
    if (!cuadra) {
      setError(
        tipoVenta === 'contado'
          ? `Los pagos no cuadran. Diferencia: $${Math.abs(diferencia).toFixed(2)} USD`
          : `El abono no puede superar el total. Sobra $${Math.abs(diferencia).toFixed(2)} USD`,
      );
      return;
    }
    setError('');
    setGuardando(true);
    try {
      // Crédito permite payments=[] (todo fiado).
      const paymentsLimpios = pagos.filter((p) => Number(p.amount) > 0);
      await api.post('/api/negocio/sales', {
        items: items.map((i) => ({
          productId: i.productId,
          cantidad: i.cantidad,
        })),
        payments: paymentsLimpios.map((p) => ({
          currency: p.currency,
          method: p.method,
          amount: Number(p.amount),
        })),
        tipoVenta,
        customerId: cliente?.id,
        notas: notas.trim() || undefined,
      });
      onCreada();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Error registrando la venta',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title="Nueva venta" onCerrar={onCerrar} ancho="max-w-3xl">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 mb-6 -mt-2">
        <StepDot active label="1" subtitle="Productos" current={paso === 1} done={paso > 1} />
        <div className={`h-0.5 w-16 ${paso === 2 ? 'bg-primary' : 'bg-gray-200'}`} />
        <StepDot active={paso === 2} label="2" subtitle="Pagos" current={paso === 2} />
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {paso === 1 ? (
        <Paso1ProductosWeb
          items={items}
          totalUsd={totalUsd}
          tasas={tasas}
          productos={filtrados}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          onAgregar={agregarProducto}
          onCambiarCantidad={cambiarCantidad}
          onQuitar={(id) =>
            setItems(items.filter((i) => i.productId !== id))
          }
        />
      ) : (
        <>
          <TipoVentaSelector
            tipoVenta={tipoVenta}
            cliente={cliente}
            notas={notas}
            onTipoChange={(t) => {
              // El cliente NO se limpia al pasar a contado: una venta de
              // contado tambien puede asociar cliente para historial y
              // beneficios de fidelidad.
              setTipoVenta(t);
            }}
            onClienteChange={setCliente}
            onNotasChange={setNotas}
          />
          <Paso2PagosWeb
            tipoVenta={tipoVenta}
            pagos={pagos}
            tasas={tasas}
            totalUsd={totalUsd}
            sumaPagosUsd={sumaPagosUsd}
            saldoUsd={saldoUsd}
            diferencia={diferencia}
            cuadra={cuadra}
            onUpdate={updatePago}
          />
        </>
      )}

      {/* Footer navegación */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancelar
        </button>
        <div className="flex gap-2">
          {paso === 2 && (
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              ← Atrás
            </button>
          )}
          {paso === 1 ? (
            <button
              type="button"
              onClick={irAPagos}
              disabled={items.length === 0}
              className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-50">
              Siguiente: pagos · ${totalUsd.toFixed(2)} →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit as unknown as () => void}
              disabled={guardando || !cuadra}
              className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-50">
              {guardando ? 'Registrando...' : 'Confirmar venta'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StepDot({
  active,
  label,
  subtitle,
  current,
  done,
}: {
  active?: boolean;
  label: string;
  subtitle: string;
  current?: boolean;
  done?: boolean;
}) {
  const fill = current
    ? 'bg-primary text-white border-primary'
    : done
    ? 'bg-green-500 text-white border-green-500'
    : 'bg-gray-200 text-gray-500 border-gray-200';
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${fill}`}>
        {done ? '✓' : label}
      </div>
      <span
        className={`text-xs mt-1 ${
          current ? 'text-primary font-semibold' : 'text-gray-500'
        }`}>
        {subtitle}
      </span>
    </div>
  );
}

// ============================================================================
// PASO 1 — PRODUCTOS
// ============================================================================

function Paso1ProductosWeb({
  items,
  totalUsd,
  tasas,
  productos,
  busqueda,
  onBusqueda,
  onAgregar,
  onCambiarCantidad,
  onQuitar,
}: {
  items: ItemBorrador[];
  totalUsd: number;
  tasas: CurrentRates | null;
  productos: Producto[];
  busqueda: string;
  onBusqueda: (s: string) => void;
  onAgregar: (p: Producto) => void;
  onCambiarCantidad: (id: string, cantidad: number) => void;
  onQuitar: (id: string) => void;
}) {
  return (
    <>
      {/* Total card */}
      <div className="bg-primary text-white rounded-xl p-5 mb-5 text-center">
        <div className="text-xs uppercase opacity-90 font-semibold tracking-wider">
          Total a cobrar
        </div>
        <div className="text-4xl font-extrabold mt-1">
          ${totalUsd.toFixed(2)}
          <span className="text-base font-normal opacity-90 ml-2">USD</span>
        </div>
        {(tasas?.VES || tasas?.COP) && (
          <div className="text-sm mt-2 opacity-90 space-x-3">
            {tasas?.VES && (
              <span>≈ {(totalUsd * tasas.VES).toLocaleString()} Bs</span>
            )}
            {tasas?.COP && (
              <span>≈ {(totalUsd * tasas.COP).toLocaleString()} COP</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Productos */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-gray-700">
            Productos disponibles
          </h4>
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="border border-gray-200 rounded-md max-h-72 overflow-y-auto">
            {productos.length === 0 ? (
              <div className="text-xs text-gray-500 p-3">
                Sin productos disponibles.
              </div>
            ) : (
              productos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAgregar(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium">{p.nombre}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Stock: {p.stock} · ${Number(p.precio).toFixed(2)} USD
                    </div>
                  </div>
                  <span className="text-primary font-bold text-xl leading-none">
                    +
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Carrito */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-gray-700">
            Carrito ({items.length})
          </h4>
          <div className="border border-gray-200 rounded-md max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-xs text-gray-500 p-4 text-center">
                Tu carrito está vacío.<br />
                Agrega productos del listado.
              </div>
            ) : (
              items.map((i) => (
                <div
                  key={i.productId}
                  className="px-3 py-2 text-sm border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{i.nombre}</span>
                    <button
                      type="button"
                      onClick={() => onQuitar(i.productId)}
                      className="text-red-500 text-xs hover:underline ml-2">
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      min={1}
                      max={i.stockDisponible}
                      value={i.cantidad}
                      onChange={(e) =>
                        onCambiarCantidad(i.productId, Number(e.target.value))
                      }
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-gray-500">
                      x ${i.precioUsd.toFixed(2)} ={' '}
                      <strong className="text-gray-800">
                        ${(i.precioUsd * i.cantidad).toFixed(2)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// PASO 2 — PAGOS
// ============================================================================

function Paso2PagosWeb({
  tipoVenta,
  pagos,
  tasas,
  totalUsd,
  sumaPagosUsd,
  saldoUsd,
  diferencia,
  cuadra,
  onUpdate,
}: {
  tipoVenta: TipoVenta;
  pagos: PagoBorrador[];
  tasas: CurrentRates | null;
  totalUsd: number;
  sumaPagosUsd: number;
  saldoUsd: number;
  diferencia: number;
  cuadra: boolean;
  onUpdate: (id: string, patch: Partial<PagoBorrador>) => void;
}) {
  const pago = pagos[0];
  return (
    <>
      {/* Resumen del cuadre */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 font-semibold">Total</span>
          <span className="text-2xl font-bold">${totalUsd.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 font-semibold">
            {tipoVenta === 'credito' ? 'Abonado ahora' : 'Recibido'}
          </span>
          <span className="text-xl font-bold text-primary">
            ${sumaPagosUsd.toFixed(2)} USD
          </span>
        </div>
        {tipoVenta === 'credito' && saldoUsd > 0.01 && (
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
            <span className="text-sm text-amber-800 font-semibold">
              Saldo pendiente
            </span>
            <span className="text-xl font-bold text-amber-700">
              ${saldoUsd.toFixed(2)} USD
            </span>
          </div>
        )}

        {tipoVenta === 'contado' ? (
          cuadra ? (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-md py-2 text-center">
              ✅ Pagos cuadran con el total
            </div>
          ) : (
            <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold rounded-md py-2 text-center">
              ⚠️{' '}
              {diferencia > 0
                ? `Falta $${diferencia.toFixed(2)} USD`
                : `Sobra $${Math.abs(diferencia).toFixed(2)} USD`}
            </div>
          )
        ) : !cuadra ? (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-md py-2 text-center">
            ⚠️ El abono inicial no puede superar el total
          </div>
        ) : sumaPagosUsd === 0 ? (
          <div className="mt-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold rounded-md py-2 text-center">
            💳 Venta completamente fiada (saldo = total)
          </div>
        ) : saldoUsd <= 0.01 ? (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-md py-2 text-center">
            ✅ Pagado en pleno (no quedará saldo)
          </div>
        ) : (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold rounded-md py-2 text-center">
            💳 Abono parcial — el cliente queda debiendo ${saldoUsd.toFixed(2)} USD
          </div>
        )}
      </div>

      <h4 className="font-semibold text-sm mb-3 text-gray-700 uppercase tracking-wide">
        {tipoVenta === 'credito' ? 'Abono inicial (opcional)' : 'Forma de pago'}
      </h4>

      {pago && (
        <PagoCard
          pago={pago}
          tasas={tasas}
          onUpdate={(patch) => onUpdate(pago.id, patch)}
        />
      )}

      <p className="text-xs text-gray-500 mt-4 text-center">
        💡 Cuando cambies la moneda, el monto se ajusta solo al equivalente.
      </p>
    </>
  );
}

function PagoCard({
  pago,
  tasas,
  onUpdate,
}: {
  pago: PagoBorrador;
  tasas: CurrentRates | null;
  onUpdate: (patch: Partial<PagoBorrador>) => void;
}) {
  const validos = COMBINACIONES_VALIDAS[pago.currency];
  const sinTasa =
    (pago.currency === 'VES' && !tasas?.VES) ||
    (pago.currency === 'COP' && !tasas?.COP);
  const equivUsd = toUsd(Number(pago.amount), pago.currency, tasas);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Moneda - chips */}
      <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-1.5">
        Moneda
      </label>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(['USD', 'VES', 'COP'] as const).map((c) => {
          const on = pago.currency === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onUpdate({ currency: c })}
              className={`py-2 rounded-md text-sm font-bold border ${
                on
                  ? 'bg-primary text-white border-primary'
                  : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
              }`}>
              {c}
            </button>
          );
        })}
      </div>

      {/* Método - chips */}
      <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-1.5">
        Método
      </label>
      <div
        className="grid gap-2 mb-3"
        style={{ gridTemplateColumns: `repeat(${validos.length}, 1fr)` }}>
        {validos.map((m) => {
          const on = pago.method === m;
          const label =
            m === 'pago_movil' ? 'Pago móvil' : m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onUpdate({ method: m })}
              className={`py-2 rounded-md text-sm font-bold border capitalize ${
                on
                  ? 'bg-primary text-white border-primary'
                  : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
              }`}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Monto */}
      <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-1.5">
        Monto en {pago.currency}
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={pago.amount}
        onChange={(e) => onUpdate({ amount: e.target.value })}
        className="w-full border border-gray-300 rounded-md px-3 py-3 text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {sinTasa ? (
        <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-md p-2">
          ⚠️ Tasa de {pago.currency} no configurada. Súbela en Tasas de cambio.
        </div>
      ) : pago.currency !== 'USD' ? (
        <div className="text-xs text-gray-500 mt-2 text-right">
          ≈ <strong className="text-gray-800">${equivUsd.toFixed(2)} USD</strong>
        </div>
      ) : null}
    </div>
  );
}


// ============================================================================
// DETALLE
// ============================================================================

function DetalleVenta({
  venta,
  onCerrar,
}: {
  venta: Sale;
  onCerrar: () => void;
}) {
  const [descargando, setDescargando] = useState(false);
  const descargarComprobante = async () => {
    setDescargando(true);
    try {
      await downloadPdf(
        `/api/negocio/sales/${venta.id}/comprobante.pdf`,
        {},
        `comprobante-${venta.id.slice(0, 8)}.pdf`,
      );
    } catch (err) {
      alert('No se pudo generar el comprobante.');
      console.error(err);
    } finally {
      setDescargando(false);
    }
  };
  return (
    <Modal title={`Venta · ${venta.id.slice(0, 8)}`} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="flex justify-end mb-2">
        <button
          onClick={descargarComprobante}
          disabled={descargando}
          className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-50 disabled:opacity-50">
          {descargando ? 'Generando…' : '📄 Comprobante PDF'}
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Fecha">{new Date(venta.fecha).toLocaleString()}</Row>
        <Row label="Tipo">
          {venta.tipoVenta === 'credito' ? '💳 Crédito' : '💵 Contado'}
        </Row>
        {venta.customer && (
          <Row label="Cliente">
            <strong>{venta.customer.nombre}</strong>
            <span className="text-gray-500 font-mono ml-2">
              {venta.customer.cedula}
            </span>
            {venta.customer.telefono && (
              <span className="text-gray-500 ml-2">
                · {venta.customer.telefono}
              </span>
            )}
          </Row>
        )}
        <Row label="Vendedor">
          {venta.userNombre ?? '—'} ({venta.userEmail})
        </Row>
        <Row label="Estado">
          <EstadoBadge estado={venta.estado} activo={venta.activo} />
        </Row>
        {Number(venta.saldoUsd) > 0.01 && (
          <Row label="Saldo pendiente">
            <strong className="text-amber-700">
              ${Number(venta.saldoUsd).toLocaleString()} USD
            </strong>
          </Row>
        )}
        {venta.notas && <Row label="Notas">{venta.notas}</Row>}
        {venta.estado === 'anulada' && (
          <>
            <Row label="Motivo anulación">{venta.motivoAnulacion}</Row>
            <Row label="Anulada en">
              {venta.anuladaEn ? new Date(venta.anuladaEn).toLocaleString() : '—'}
            </Row>
          </>
        )}
      </div>

      <h4 className="font-semibold text-sm mt-5 mb-2">Items</h4>
      <table className="w-full text-sm mb-4">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Producto</th>
            <th className="px-3 py-2 text-right">Cant.</th>
            <th className="px-3 py-2 text-right">Precio USD</th>
            <th className="px-3 py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {venta.items.map((it) => (
            <tr key={it.id}>
              <td className="px-3 py-2">{it.productNombre}</td>
              <td className="px-3 py-2 text-right">{it.cantidad}</td>
              <td className="px-3 py-2 text-right">${Number(it.precioUnitario).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-semibold">${Number(it.subtotal).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
            <td className="px-3 py-2 text-right font-bold text-lg">
              ${Number(venta.total).toLocaleString()} USD
            </td>
          </tr>
        </tfoot>
      </table>

      <h4 className="font-semibold text-sm mb-2">Pagos ({venta.payments.length})</h4>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Moneda</th>
            <th className="px-3 py-2 text-left">Método</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2 text-right">Tasa</th>
            <th className="px-3 py-2 text-right">USD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {venta.payments.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-semibold">{p.currency}</td>
              <td className="px-3 py-2 capitalize">{p.method.replace('_', ' ')}</td>
              <td className="px-3 py-2 text-right">{Number(p.amountOriginal).toLocaleString()} {p.currency}</td>
              <td className="px-3 py-2 text-right text-gray-500 text-xs">{Number(p.exchangeRate).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-semibold">${Number(p.amountUsd).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-5">
        <button onClick={onCerrar} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold">
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

// ============================================================================
// ANULAR
// ============================================================================

function AnularVentaForm({
  venta,
  onCerrar,
  onAnulada,
}: {
  venta: Sale;
  onCerrar: () => void;
  onAnulada: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await api.patch(`/api/negocio/sales/${venta.id}/cancel`, { motivo });
      onAnulada();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title="Anular venta" onCerrar={onCerrar}>
      <form onSubmit={submit}>
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className="text-sm text-gray-700 mb-3">
          Esta acción <strong>devuelve el stock</strong> de los {venta.items.length} item(s).
          Los pagos NO se reembolsan automáticamente.
        </p>
        <Field label="Motivo (mínimo 5 caracteres)">
          <textarea
            className={inputCls + ' min-h-[80px]'}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: cliente devolvió el producto"
          />
        </Field>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm">Cancelar</button>
          <button
            type="submit"
            disabled={guardando}
            className="px-4 py-2 bg-amber-500 text-white rounded-md text-sm font-semibold disabled:opacity-60">
            {guardando ? 'Anulando...' : 'Confirmar anulación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// REPORTES
// ============================================================================

function ReportesVentas() {
  const [periodo, setPeriodo] = useState<'daily' | 'monthly'>('daily');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [datos, setDatos] = useState<
    Array<{ fecha?: string; mes?: string; total: number; cantidad: number }>
  >([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const params: Record<string, string> = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      const { data } = await api.get<{
        ventas: Array<{ fecha?: string; mes?: string; total: number; cantidad: number }>;
      }>(`/api/negocio/sales/reports/${periodo}`, { params });
      setDatos(data.ventas);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const totalAcumulado = datos.reduce((acc, d) => acc + d.total, 0);
  const cantidadTotal = datos.reduce((acc, d) => acc + d.cantidad, 0);
  const promedio = datos.length > 0 ? totalAcumulado / datos.length : 0;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Field label="Periodo">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as 'daily' | 'monthly')}
            className={inputCls}>
            <option value="daily">Por día</option>
            <option value="monthly">Por mes</option>
          </select>
        </Field>
        <Field label="Desde">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Hasta">
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
        </Field>
        <button onClick={cargar} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold">
          Aplicar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Total acumulado (USD)" value={`$${totalAcumulado.toFixed(2)}`} />
        <KpiCard label="Ventas registradas" value={cantidadTotal.toString()} />
        <KpiCard label="Promedio por periodo" value={`$${promedio.toFixed(2)}`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr className="text-left">
              <th className="px-3 py-2">{periodo === 'daily' ? 'Fecha' : 'Mes'}</th>
              <th className="px-3 py-2 text-right">Cantidad</th>
              <th className="px-3 py-2 text-right">Total (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">Cargando...</td></tr>
            )}
            {!cargando && datos.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">Sin ventas en este rango.</td></tr>
            )}
            {datos.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2">{d.fecha ?? d.mes}</td>
                <td className="px-3 py-2 text-right">{d.cantidad}</td>
                <td className="px-3 py-2 text-right font-semibold">${d.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ============================================================================
// HELPERS UI
// ============================================================================

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

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
        active ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}>
      {children}
    </button>
  );
}

function EstadoBadge({ estado, activo }: { estado: EstadoVenta; activo: boolean }) {
  if (!activo) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-700">INACTIVA</span>;
  }
  if (estado === 'anulada') {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">ANULADA</span>;
  }
  if (estado === 'pendiente') {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">PENDIENTE</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">COMPLETADA</span>;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs uppercase text-gray-500 font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Modal({
  title,
  children,
  onCerrar,
  ancho = 'max-w-lg',
}: {
  title: string;
  children: React.ReactNode;
  onCerrar: () => void;
  ancho?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <div className={`bg-white rounded-xl shadow-xl p-6 w-full ${ancho} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3">
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex">
      <span className="w-32 text-gray-500 shrink-0">{label}</span>
      <span className="flex-1">{children}</span>
    </div>
  );
}

// ============================================================================
// TIPO DE VENTA + SELECTOR DE CLIENTE
// ============================================================================

function TipoVentaSelector({
  tipoVenta,
  cliente,
  notas,
  onTipoChange,
  onClienteChange,
  onNotasChange,
}: {
  tipoVenta: TipoVenta;
  cliente: Customer | null;
  notas: string;
  onTipoChange: (t: TipoVenta) => void;
  onClienteChange: (c: Customer | null) => void;
  onNotasChange: (s: string) => void;
}) {
  const [pickerAbierto, setPickerAbierto] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-2">
        Tipo de venta
      </label>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={() => onTipoChange('contado')}
          className={`py-3 rounded-md font-bold text-sm border ${
            tipoVenta === 'contado'
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
          }`}>
          💵 Contado
          <div className="text-xs font-normal opacity-80">Paga todo ahora</div>
        </button>
        <button
          type="button"
          onClick={() => onTipoChange('credito')}
          className={`py-3 rounded-md font-bold text-sm border ${
            tipoVenta === 'credito'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
          }`}>
          💳 Crédito
          <div className="text-xs font-normal opacity-80">Abona o fía</div>
        </button>
      </div>

      {/* Cliente: requerido en credito, opcional en contado (para
          historial de compras y futuros beneficios de fidelidad). */}
      <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-2">
        {tipoVenta === 'credito' ? 'Cliente *' : 'Cliente (opcional)'}
      </label>
      {cliente ? (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-3 mb-2">
          <div>
            <div className="font-bold text-sm">{cliente.nombre}</div>
            <div className="text-xs text-gray-500 font-mono">
              {cliente.cedula}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClienteChange(null)}
            className="text-xs text-red-600 hover:underline">
            {tipoVenta === 'credito' ? 'Cambiar' : 'Quitar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerAbierto(true)}
          className={`w-full border-2 border-dashed rounded-md py-3 text-sm font-bold ${
            tipoVenta === 'credito'
              ? 'border-amber-400 text-amber-700 hover:bg-amber-50'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}>
          🔍 Buscar / crear cliente
        </button>
      )}
      {pickerAbierto && (
        <ClientePicker
          onCerrar={() => setPickerAbierto(false)}
          onElegir={(c) => {
            onClienteChange(c);
            setPickerAbierto(false);
          }}
        />
      )}

      <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mt-3 mb-1">
        Notas (opcional)
      </label>
      <input
        type="text"
        value={notas}
        onChange={(e) => onNotasChange(e.target.value)}
        placeholder="Ej: paga la próxima semana, se llevó sin caja..."
        maxLength={500}
        className={inputCls}
      />
    </div>
  );
}

function ClientePicker({
  onCerrar,
  onElegir,
}: {
  onCerrar: () => void;
  onElegir: (c: Customer) => void;
}) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Customer[]>([]);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    api
      .get<Customer[]>('/api/negocio/customers', { params: query ? { q: query } : {} })
      .then((r) => setResultados(r.data));
  }, [query]);

  return (
    <Modal title="Elegir cliente" onCerrar={onCerrar} ancho="max-w-lg">
      <input
        type="text"
        autoFocus
        placeholder="Buscar por cédula o nombre..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={inputCls + ' mb-3'}
      />

      <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
        {resultados.length === 0 ? (
          <div className="text-xs text-gray-500 p-4 text-center">
            Sin resultados.
          </div>
        ) : (
          resultados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onElegir(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
              <div className="font-medium">{c.nombre}</div>
              <div className="text-xs text-gray-500 font-mono">
                {c.cedula}
                {c.telefono ? ` · ${c.telefono}` : ''}
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-3 text-center">
        {creando ? (
          <CrearClienteInline
            onCancelar={() => setCreando(false)}
            onCreado={(c) => {
              setCreando(false);
              onElegir(c);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="text-sm text-primary font-bold hover:underline">
            + Registrar cliente nuevo
          </button>
        )}
      </div>
    </Modal>
  );
}

function CrearClienteInline({
  onCancelar,
  onCreado,
}: {
  onCancelar: () => void;
  onCreado: (c: Customer) => void;
}) {
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const { data } = await api.post<Customer>('/api/negocio/customers', {
        cedula,
        nombre,
        telefono: telefono || undefined,
      });
      onCreado(data);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Error',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={submit} className="text-left bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
      <div className="text-xs font-bold text-amber-800 mb-2">Nuevo cliente</div>
      {error && (
        <div className="text-xs text-red-700 mb-2">{error}</div>
      )}
      <div className="space-y-2">
        <input
          autoFocus
          placeholder="Cédula (ej. V-12345678)"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          required
          className={inputCls}
        />
        <input
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className={inputCls}
        />
        <input
          placeholder="Teléfono (opcional)"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-3 py-1.5 text-xs text-gray-600">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="px-3 py-1.5 bg-primary text-white text-xs rounded-md font-semibold disabled:opacity-60">
          {guardando ? 'Guardando...' : 'Registrar'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// REGISTRAR ABONO
// ============================================================================

export function RegistrarAbonoForm({
  venta,
  onCerrar,
  onAbonado,
}: {
  venta: Sale;
  onCerrar: () => void;
  onAbonado: () => void;
}) {
  const [tasas, setTasas] = useState<CurrentRates | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [amount, setAmount] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api
      .get<CurrentRates>('/api/negocio/exchange-rates/current')
      .then((r) => {
        setTasas(r.data);
        // Pre-llenar con el saldo completo en USD para cerrar la deuda
        // de un solo abono si quiere.
        setAmount(Number(venta.saldoUsd).toFixed(2));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validos = COMBINACIONES_VALIDAS[currency];
  if (!validos.includes(method)) {
    // Auto-corregir si la combinación quedó inválida.
    setMethod(validos[0]);
  }

  const equivUsd = toUsd(Number(amount), currency, tasas);
  const saldoActual = Number(venta.saldoUsd);
  const saldoTrasAbono = saldoActual - equivUsd;
  const sobra = saldoTrasAbono < -0.01;
  const completaria = Math.abs(saldoTrasAbono) <= 0.01;

  const cambiarCurrency = (c: Currency) => {
    if (c === currency) return;
    // Convertir el monto al equivalente en la nueva moneda.
    const usd = toUsd(Number(amount), currency, tasas);
    const nuevo = fromUsd(usd, c, tasas);
    setCurrency(c);
    if (!validos.includes(method)) {
      setMethod(COMBINACIONES_VALIDAS[c][0]);
    }
    if (nuevo !== null) setAmount(nuevo.toFixed(2));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sobra) {
      setError('El abono no puede superar el saldo pendiente');
      return;
    }
    if (Number(amount) <= 0) {
      setError('Indica un monto positivo');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await api.post(`/api/negocio/sales/${venta.id}/abonos`, {
        currency,
        method,
        amount: Number(amount),
        notas: notas.trim() || undefined,
      });
      onAbonado();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Error registrando abono',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title="Registrar abono" onCerrar={onCerrar} ancho="max-w-md">
      <form onSubmit={submit}>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
          <div className="text-xs uppercase font-bold text-amber-800">
            Saldo pendiente
          </div>
          <div className="text-2xl font-extrabold text-amber-900">
            ${saldoActual.toFixed(2)} USD
          </div>
          {venta.customer && (
            <div className="text-xs text-amber-800 mt-1">
              {venta.customer.nombre} · {venta.customer.cedula}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-1.5">
          Moneda
        </label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['USD', 'VES', 'COP'] as const).map((c) => {
            const on = currency === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => cambiarCurrency(c)}
                className={`py-2 rounded-md text-sm font-bold border ${
                  on
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-100 text-gray-700 border-transparent'
                }`}>
                {c}
              </button>
            );
          })}
        </div>

        <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-1.5">
          Método
        </label>
        <div
          className="grid gap-2 mb-3"
          style={{ gridTemplateColumns: `repeat(${validos.length}, 1fr)` }}>
          {validos.map((m) => {
            const on = method === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-2 rounded-md text-sm font-bold border capitalize ${
                  on
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-100 text-gray-700 border-transparent'
                }`}>
                {m === 'pago_movil' ? 'Pago móvil' : m}
              </button>
            );
          })}
        </div>

        <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mb-1.5">
          Monto en {currency}
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-3 text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {currency !== 'USD' && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            ≈ <strong className="text-gray-800">${equivUsd.toFixed(2)} USD</strong>
          </div>
        )}

        {completaria && (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-md py-2 text-center">
            ✅ Este abono cierra la deuda
          </div>
        )}
        {sobra && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-md py-2 text-center">
            ⚠️ Sobra ${Math.abs(saldoTrasAbono).toFixed(2)} USD del saldo
          </div>
        )}
        {!completaria && !sobra && Number(amount) > 0 && (
          <div className="mt-3 text-xs text-gray-600 text-center">
            Saldo restante después del abono:{' '}
            <strong className="text-gray-800">${saldoTrasAbono.toFixed(2)} USD</strong>
          </div>
        )}

        <label className="block text-xs uppercase font-bold text-gray-500 tracking-wide mt-3 mb-1.5">
          Notas (opcional)
        </label>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          maxLength={300}
          className={inputCls}
        />

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || sobra || Number(amount) <= 0}
            className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Registrar abono'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
