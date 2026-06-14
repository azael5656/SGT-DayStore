import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Banknote,
  Check,
  CreditCard,
  Eye,
  FileText,
  HandCoins,
  Lightbulb,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
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
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Input from '../components/ui/Input';
import FieldUI from '../components/ui/Field';
import Chip from '../components/ui/Chip';
import Checkbox from '../components/ui/Checkbox';
import DatePicker from '../components/ui/DatePicker';
import KpiCardUI from '../components/ui/KpiCard';
import Tabs from '../components/ui/Tabs';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { ESTADO_VARIANT } from '../components/ui/variants';
import { useConfirm } from '../components/ui/ConfirmProvider';

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
        <h1 className="font-heading text-2xl font-extrabold text-text flex items-center gap-2">
          <ShoppingBag size={24} strokeWidth={1.75} className="text-accent" />
          Ventas
        </h1>
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as 'lista' | 'reportes')}
          items={[
            { id: 'lista', label: 'Lista' },
            ...(esGerencia ? [{ id: 'reportes', label: 'Reportes' }] : []),
          ]}
        />
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
  const confirm = useConfirm();
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
    const ok = await confirm({
      title: 'Anular venta',
      message: `Soft-delete venta ${s.id.slice(0, 8)}?`,
      confirmText: 'Anular',
      danger: true,
    });
    if (!ok) return;
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
          <DatePicker value={desde} onChange={setDesde} placeholder="Desde" className="w-40" />
        </Field>
        <Field label="Hasta">
          <DatePicker value={hasta} onChange={setHasta} placeholder="Hasta" className="w-40" />
        </Field>
        <Checkbox
          className="pb-2"
          label="Incluir anuladas"
          checked={incluirAnuladas}
          onChange={(e) => setIncluirAnuladas(e.target.checked)}
        />
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={descargarHistorialPdf}
          disabled={descargandoPdf}
          leftIcon={<FileText size={16} strokeWidth={1.75} />}>
          {descargandoPdf ? 'Generando…' : 'Descargar PDF'}
        </Button>
        <Button onClick={() => setCrearAbierto(true)}>+ Nueva venta</Button>
      </div>

      <Table className="min-w-[920px]">
        <THead>
          <tr className="text-left">
            <TH>Fecha</TH>
            <TH>Cliente</TH>
            <TH>Tipo</TH>
            <TH className="text-right">Total</TH>
            <TH className="text-right">Saldo</TH>
            <TH>Estado</TH>
            <TH></TH>
          </tr>
        </THead>
        <TBody>
          {cargando && (
            <tr>
              <TD colSpan={7} className="py-6 text-center text-text-muted">
                Cargando...
              </TD>
            </tr>
          )}
          {!cargando && ventas.length === 0 && (
            <tr>
              <TD colSpan={7} className="py-6 text-center text-text-muted">
                Sin ventas en este filtro.
              </TD>
            </tr>
          )}
          {ventas.map((s) => (
            <TR key={s.id}>
              <TD className="text-text-muted">
                {new Date(s.fecha).toLocaleString()}
              </TD>
              <TD>
                {s.customer ? (
                  <>
                    <div className="font-medium">{s.customer.nombre}</div>
                    <div className="text-xs text-text-muted font-mono">
                      {s.customer.cedula}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-text-muted">—</span>
                )}
              </TD>
              <TD>
                {s.tipoVenta === 'credito' ? (
                  <Badge tone="warning">CRÉDITO</Badge>
                ) : (
                  <Badge tone="success">CONTADO</Badge>
                )}
              </TD>
              <TD className="text-right font-semibold">
                ${Number(s.total).toLocaleString()}
              </TD>
              <TD className="text-right">
                {Number(s.saldoUsd) > 0.01 ? (
                  <span className="font-bold text-warning">
                    ${Number(s.saldoUsd).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </TD>
              <TD>
                <EstadoBadge estado={s.estado} activo={s.activo} />
              </TD>
              <TD className="text-right whitespace-nowrap">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" leftIcon={<Eye size={15} strokeWidth={1.75} />} onClick={() => setVerDetalle(s)}>
                    Ver
                  </Button>
                  {s.estado === 'pendiente' && s.activo && (
                    <Button variant="ghost" size="sm" leftIcon={<HandCoins size={15} strokeWidth={1.75} />} onClick={() => setAbonando(s)}>
                      Abonar
                    </Button>
                  )}
                  {esGerencia && s.estado !== 'anulada' && s.activo && (
                    <Button variant="ghost" size="sm" leftIcon={<Ban size={15} strokeWidth={1.75} />} onClick={() => setAnulando(s)}>
                      Anular
                    </Button>
                  )}
                  {esSuperadmin && s.activo && (
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 size={15} strokeWidth={1.75} />} onClick={() => softDelete(s)}>
                      Borrar
                    </Button>
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {total > limit && (
        <div className="flex justify-between items-center mt-3 text-sm">
          <span className="text-text-muted">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
          </span>
          <div className="flex gap-2 items-center">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => cargar(page - 1)}
              leftIcon={<ArrowLeft size={16} strokeWidth={1.75} />}>
              Anterior
            </Button>
            <span className="px-2 py-1">
              {page} / {totalPaginas}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPaginas}
              onClick={() => cargar(page + 1)}>
              Siguiente
              <ArrowRight size={16} strokeWidth={1.75} />
            </Button>
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
        <div className={`h-0.5 w-16 ${paso === 2 ? 'bg-accent-fill' : 'bg-border'}`} />
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
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
        <Button variant="ghost" type="button" onClick={onCerrar}>
          Cancelar
        </Button>
        <div className="flex gap-2">
          {paso === 2 && (
            <Button
              variant="secondary"
              type="button"
              onClick={() => setPaso(1)}
              leftIcon={<ArrowLeft size={16} strokeWidth={1.75} />}>
              Atrás
            </Button>
          )}
          {paso === 1 ? (
            <Button
              type="button"
              onClick={irAPagos}
              disabled={items.length === 0}>
              Siguiente: pagos · ${totalUsd.toFixed(2)}
              <ArrowRight size={16} strokeWidth={1.75} />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit as unknown as () => void}
              disabled={guardando || !cuadra}>
              {guardando ? 'Registrando...' : 'Confirmar venta'}
            </Button>
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
    ? 'bg-accent-fill text-accent-contrast border-accent-fill'
    : done
    ? 'bg-success text-white border-success'
    : 'bg-surface-alt text-text-muted border-border';
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${fill}`}>
        {done ? <Check size={16} strokeWidth={2} /> : label}
      </div>
      <span
        className={`text-xs mt-1 ${
          current ? 'text-accent font-semibold' : 'text-text-muted'
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
      <div className="bg-accent-fill text-accent-contrast rounded-2xl p-5 mb-5 text-center">
        <div className="text-xs uppercase opacity-90 font-semibold tracking-wider">
          Total a cobrar
        </div>
        <div className="font-heading text-4xl font-extrabold mt-1">
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
          <h4 className="font-semibold text-sm mb-2 text-text">
            Productos disponibles
          </h4>
          <Input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            leftIcon={<Search size={16} strokeWidth={1.75} />}
            className="mb-2"
          />
          <div className="border border-border rounded-xl max-h-72 overflow-y-auto">
            {productos.length === 0 ? (
              <div className="text-xs text-text-muted p-3">
                Sin productos disponibles.
              </div>
            ) : (
              productos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAgregar(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-alt flex justify-between items-center border-b border-border last:border-0">
                  <div>
                    <div className="font-medium">{p.nombre}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Stock: {p.stock} · ${Number(p.precio).toFixed(2)} USD
                    </div>
                  </div>
                  <span className="text-accent font-bold text-xl leading-none">
                    +
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Carrito */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-text">
            Carrito ({items.length})
          </h4>
          <div className="border border-border rounded-xl max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-xs text-text-muted p-4 text-center">
                Tu carrito está vacío.<br />
                Agrega productos del listado.
              </div>
            ) : (
              items.map((i) => (
                <div
                  key={i.productId}
                  className="px-3 py-2 text-sm border-b border-border last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{i.nombre}</span>
                    <button
                      type="button"
                      onClick={() => onQuitar(i.productId)}
                      className="text-danger text-xs hover:underline ml-2">
                      <X size={14} strokeWidth={1.75} />
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
                      className="w-20 bg-bg border border-border rounded-xl px-2 py-1 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                    <span className="text-xs text-text-muted">
                      x ${i.precioUsd.toFixed(2)} ={' '}
                      <strong className="text-text">
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
      <div className="bg-surface-alt rounded-2xl p-4 mb-5 border border-border">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-muted font-semibold">Total</span>
          <span className="font-heading text-2xl font-bold">${totalUsd.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-muted font-semibold">
            {tipoVenta === 'credito' ? 'Abonado ahora' : 'Recibido'}
          </span>
          <span className="font-heading text-xl font-bold text-accent">
            ${sumaPagosUsd.toFixed(2)} USD
          </span>
        </div>
        {tipoVenta === 'credito' && saldoUsd > 0.01 && (
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
            <span className="text-sm text-warning font-semibold">
              Saldo pendiente
            </span>
            <span className="font-heading text-xl font-bold text-warning">
              ${saldoUsd.toFixed(2)} USD
            </span>
          </div>
        )}

        <div className="mt-3">
          {tipoVenta === 'contado' ? (
            cuadra ? (
              <Alert tone="success">Pagos cuadran con el total</Alert>
            ) : (
              <Alert tone="warning">
                {diferencia > 0
                  ? `Falta $${diferencia.toFixed(2)} USD`
                  : `Sobra $${Math.abs(diferencia).toFixed(2)} USD`}
              </Alert>
            )
          ) : !cuadra ? (
            <Alert tone="danger">El abono inicial no puede superar el total</Alert>
          ) : sumaPagosUsd === 0 ? (
            <Alert tone="info">Venta completamente fiada (saldo = total)</Alert>
          ) : saldoUsd <= 0.01 ? (
            <Alert tone="success">Pagado en pleno (no quedará saldo)</Alert>
          ) : (
            <Alert tone="warning">
              Abono parcial — el cliente queda debiendo ${saldoUsd.toFixed(2)} USD
            </Alert>
          )}
        </div>
      </div>

      <h4 className="font-semibold text-sm mb-3 text-text-muted uppercase tracking-wide">
        {tipoVenta === 'credito' ? 'Abono inicial (opcional)' : 'Forma de pago'}
      </h4>

      {pago && (
        <PagoCard
          pago={pago}
          tasas={tasas}
          onUpdate={(patch) => onUpdate(pago.id, patch)}
        />
      )}

      <p className="text-xs text-text-muted mt-4 text-center flex items-center justify-center gap-1.5">
        <Lightbulb size={14} strokeWidth={1.75} className="text-accent" />
        Cuando cambies la moneda, el monto se ajusta solo al equivalente.
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
    <div className="bg-surface border border-border rounded-2xl p-4">
      {/* Moneda - chips */}
      <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-1.5">
        Moneda
      </label>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(['USD', 'VES', 'COP'] as const).map((c) => {
          const on = pago.currency === c;
          return (
            <Chip
              key={c}
              active={on}
              onClick={() => onUpdate({ currency: c })}
              className="justify-center">
              {c}
            </Chip>
          );
        })}
      </div>

      {/* Método - chips */}
      <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-1.5">
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
            <Chip
              key={m}
              active={on}
              onClick={() => onUpdate({ method: m })}
              className="justify-center capitalize">
              {label}
            </Chip>
          );
        })}
      </div>

      {/* Monto */}
      <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-1.5">
        Monto en {pago.currency}
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={pago.amount}
        onChange={(e) => onUpdate({ amount: e.target.value })}
        className="w-full bg-bg border border-border rounded-xl px-3 py-3 text-xl font-bold text-right text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {sinTasa ? (
        <div className="mt-2">
          <Alert tone="warning">
            Tasa de {pago.currency} no configurada. Súbela en Tasas de cambio.
          </Alert>
        </div>
      ) : pago.currency !== 'USD' ? (
        <div className="text-xs text-text-muted mt-2 text-right">
          ≈ <strong className="text-text">${equivUsd.toFixed(2)} USD</strong>
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
        <Button
          variant="secondary"
          size="sm"
          onClick={descargarComprobante}
          disabled={descargando}
          leftIcon={<FileText size={14} strokeWidth={1.75} />}>
          {descargando ? 'Generando…' : 'Comprobante PDF'}
        </Button>
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Fecha">{new Date(venta.fecha).toLocaleString()}</Row>
        <Row label="Tipo">
          <span className="inline-flex items-center gap-1.5">
            {venta.tipoVenta === 'credito' ? (
              <>
                <CreditCard size={14} strokeWidth={1.75} className="text-accent" />
                Crédito
              </>
            ) : (
              <>
                <Banknote size={14} strokeWidth={1.75} className="text-accent" />
                Contado
              </>
            )}
          </span>
        </Row>
        {venta.customer && (
          <Row label="Cliente">
            <strong>{venta.customer.nombre}</strong>
            <span className="text-text-muted font-mono ml-2">
              {venta.customer.cedula}
            </span>
            {venta.customer.telefono && (
              <span className="text-text-muted ml-2">
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
            <strong className="text-warning">
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
        <thead className="bg-surface-alt text-xs uppercase text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Producto</th>
            <th className="px-3 py-2 text-right">Cant.</th>
            <th className="px-3 py-2 text-right">Precio USD</th>
            <th className="px-3 py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
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
          <tr className="bg-surface-alt">
            <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
            <td className="px-3 py-2 text-right font-bold text-lg">
              ${Number(venta.total).toLocaleString()} USD
            </td>
          </tr>
        </tfoot>
      </table>

      <h4 className="font-semibold text-sm mb-2">Pagos ({venta.payments.length})</h4>
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-xs uppercase text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Moneda</th>
            <th className="px-3 py-2 text-left">Método</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2 text-right">Tasa</th>
            <th className="px-3 py-2 text-right">USD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {venta.payments.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-semibold">{p.currency}</td>
              <td className="px-3 py-2 capitalize">{p.method.replace('_', ' ')}</td>
              <td className="px-3 py-2 text-right">{Number(p.amountOriginal).toLocaleString()} {p.currency}</td>
              <td className="px-3 py-2 text-right text-text-muted text-xs">{Number(p.exchangeRate).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-semibold">${Number(p.amountUsd).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-5">
        <Button onClick={onCerrar}>Cerrar</Button>
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
        <p className="text-sm text-text mb-3">
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
          <Button variant="ghost" type="button" onClick={onCerrar}>Cancelar</Button>
          <Button
            variant="danger"
            type="submit"
            disabled={guardando}>
            {guardando ? 'Anulando...' : 'Confirmar anulación'}
          </Button>
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
          <DatePicker value={desde} onChange={setDesde} placeholder="Desde" className="w-40" />
        </Field>
        <Field label="Hasta">
          <DatePicker value={hasta} onChange={setHasta} placeholder="Hasta" className="w-40" />
        </Field>
        <Button onClick={cargar}>Aplicar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Total acumulado (USD)" value={`$${totalAcumulado.toFixed(2)}`} />
        <KpiCard label="Ventas registradas" value={cantidadTotal.toString()} />
        <KpiCard label="Promedio por periodo" value={`$${promedio.toFixed(2)}`} />
      </div>

      <Table>
        <THead>
          <tr className="text-left">
            <TH>{periodo === 'daily' ? 'Fecha' : 'Mes'}</TH>
            <TH className="text-right">Cantidad</TH>
            <TH className="text-right">Total (USD)</TH>
          </tr>
        </THead>
        <TBody>
          {cargando && (
            <tr><TD colSpan={3} className="py-6 text-center text-text-muted">Cargando...</TD></tr>
          )}
          {!cargando && datos.length === 0 && (
            <tr><TD colSpan={3} className="py-6 text-center text-text-muted">Sin ventas en este rango.</TD></tr>
          )}
          {datos.map((d, i) => (
            <TR key={i}>
              <TD>{d.fecha ?? d.mes}</TD>
              <TD className="text-right">{d.cantidad}</TD>
              <TD className="text-right font-semibold">${d.total.toFixed(2)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}

// ============================================================================
// HELPERS UI
// ============================================================================

const inputCls =
  'w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50';

// Wrapper local: conserva la firma `label`+`children` usada en toda la pantalla
// y delega en el componente Field del sistema de diseño.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <FieldUI label={label}>{children}</FieldUI>;
}

// Mapa de presentación del estado de venta: etiqueta + tono del Badge.
// La etiqueta de negocio (texto en mayúsculas) se conserva intacta.
function EstadoBadge({ estado, activo }: { estado: EstadoVenta; activo: boolean }) {
  if (!activo) {
    return <Badge tone="neutral">INACTIVA</Badge>;
  }
  if (estado === 'anulada') {
    return <Badge tone={ESTADO_VARIANT['anulada']}>ANULADA</Badge>;
  }
  if (estado === 'pendiente') {
    return <Badge tone={ESTADO_VARIANT['pendiente']}>PENDIENTE</Badge>;
  }
  return <Badge tone="success">COMPLETADA</Badge>;
}

// Wrapper local: misma firma `label`/`value` y delega en KpiCard del sistema.
function KpiCard({ label, value }: { label: string; value: string }) {
  return <KpiCardUI label={label} value={value} />;
}

// Modal local tokenizado. Conserva la API previa (`onCerrar`/`ancho`) y los
// anchos amplios que necesita el flujo de venta (max-w-2xl/3xl), que el Modal
// del sistema no expone. Estilo (superficie, borde, radio, icono de cierre)
// alineado al sistema de diseño.
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
      <div className={`bg-surface text-text border border-border rounded-2xl shadow-xl p-6 w-full ${ancho} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-heading text-lg font-bold">{title}</h3>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-text-muted hover:text-text transition">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <Alert tone="danger">{children}</Alert>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex">
      <span className="w-32 text-text-muted shrink-0">{label}</span>
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
    <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
      <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-2">
        Tipo de venta
      </label>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={() => onTipoChange('contado')}
          className={`py-3 rounded-xl font-bold text-sm border transition ${
            tipoVenta === 'contado'
              ? 'bg-accent-fill text-accent-contrast border-accent-fill'
              : 'bg-surface-alt text-text-muted border-border hover:border-accent'
          }`}>
          <span className="inline-flex items-center gap-1.5">
            <Banknote size={16} strokeWidth={1.75} />
            Contado
          </span>
          <div className="text-xs font-normal opacity-80">Paga todo ahora</div>
        </button>
        <button
          type="button"
          onClick={() => onTipoChange('credito')}
          className={`py-3 rounded-xl font-bold text-sm border transition ${
            tipoVenta === 'credito'
              ? 'bg-accent-fill text-accent-contrast border-accent-fill'
              : 'bg-surface-alt text-text-muted border-border hover:border-accent'
          }`}>
          <span className="inline-flex items-center gap-1.5">
            <CreditCard size={16} strokeWidth={1.75} />
            Crédito
          </span>
          <div className="text-xs font-normal opacity-80">Abona o fía</div>
        </button>
      </div>

      {/* Cliente: requerido en credito, opcional en contado (para
          historial de compras y futuros beneficios de fidelidad). */}
      <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-2">
        {tipoVenta === 'credito' ? 'Cliente *' : 'Cliente (opcional)'}
      </label>
      {cliente ? (
        <div className="flex items-center justify-between bg-surface-alt border border-border rounded-xl p-3 mb-2">
          <div>
            <div className="font-bold text-sm">{cliente.nombre}</div>
            <div className="text-xs text-text-muted font-mono">
              {cliente.cedula}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClienteChange(null)}
            className="text-xs text-danger hover:underline">
            {tipoVenta === 'credito' ? 'Cambiar' : 'Quitar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerAbierto(true)}
          className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm font-bold text-text-muted hover:border-accent hover:text-accent transition inline-flex items-center justify-center gap-1.5">
          <Search size={16} strokeWidth={1.75} />
          Buscar / crear cliente
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

      <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mt-3 mb-1">
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

      <div className="border border-border rounded-xl max-h-64 overflow-y-auto">
        {resultados.length === 0 ? (
          <div className="text-xs text-text-muted p-4 text-center">
            Sin resultados.
          </div>
        ) : (
          resultados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onElegir(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-alt border-b border-border last:border-0">
              <div className="font-medium">{c.nombre}</div>
              <div className="text-xs text-text-muted font-mono">
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
            className="text-sm text-accent font-bold hover:underline">
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
    <form onSubmit={submit} className="text-left bg-surface-alt border border-border rounded-xl p-3 mt-2">
      <div className="text-xs font-bold text-text mb-2 inline-flex items-center gap-1.5">
        <User size={14} strokeWidth={1.75} className="text-accent" />
        Nuevo cliente
      </div>
      {error && (
        <div className="text-xs text-danger mb-2">{error}</div>
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
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          size="sm"
          type="submit"
          disabled={guardando}>
          {guardando ? 'Guardando...' : 'Registrar'}
        </Button>
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
        <div className="bg-surface-alt border border-border rounded-xl p-3 mb-4" style={{ borderLeftColor: 'var(--warning)', borderLeftWidth: 4 }}>
          <div className="text-xs uppercase font-bold text-warning">
            Saldo pendiente
          </div>
          <div className="font-heading text-2xl font-extrabold text-text">
            ${saldoActual.toFixed(2)} USD
          </div>
          {venta.customer && (
            <div className="text-xs text-text-muted mt-1">
              {venta.customer.nombre} · {venta.customer.cedula}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-1.5">
          Moneda
        </label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['USD', 'VES', 'COP'] as const).map((c) => {
            const on = currency === c;
            return (
              <Chip
                key={c}
                active={on}
                onClick={() => cambiarCurrency(c)}
                className="justify-center">
                {c}
              </Chip>
            );
          })}
        </div>

        <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-1.5">
          Método
        </label>
        <div
          className="grid gap-2 mb-3"
          style={{ gridTemplateColumns: `repeat(${validos.length}, 1fr)` }}>
          {validos.map((m) => {
            const on = method === m;
            return (
              <Chip
                key={m}
                active={on}
                onClick={() => setMethod(m)}
                className="justify-center capitalize">
                {m === 'pago_movil' ? 'Pago móvil' : m}
              </Chip>
            );
          })}
        </div>

        <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mb-1.5">
          Monto en {currency}
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-bg border border-border rounded-xl px-3 py-3 text-xl font-bold text-right text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {currency !== 'USD' && (
          <div className="text-xs text-text-muted mt-1 text-right">
            ≈ <strong className="text-text">${equivUsd.toFixed(2)} USD</strong>
          </div>
        )}

        {completaria && (
          <div className="mt-3">
            <Alert tone="success">Este abono cierra la deuda</Alert>
          </div>
        )}
        {sobra && (
          <div className="mt-3">
            <Alert tone="danger">Sobra ${Math.abs(saldoTrasAbono).toFixed(2)} USD del saldo</Alert>
          </div>
        )}
        {!completaria && !sobra && Number(amount) > 0 && (
          <div className="mt-3 text-xs text-text-muted text-center">
            Saldo restante después del abono:{' '}
            <strong className="text-text">${saldoTrasAbono.toFixed(2)} USD</strong>
          </div>
        )}

        <label className="block text-xs uppercase font-bold text-text-muted tracking-wide mt-3 mb-1.5">
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
          <Button variant="ghost" type="button" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={guardando || sobra || Number(amount) <= 0}>
            {guardando ? 'Guardando...' : 'Registrar abono'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
