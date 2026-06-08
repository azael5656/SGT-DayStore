import { useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  TrendingUp,
  CalendarRange,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { CurrentRates } from '../types';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Alert from '../components/ui/Alert';
import PageHeader from '../components/ui/PageHeader';
import UiKpiCard from '../components/ui/KpiCard';
import type { Tone } from '../components/ui/variants';

/**
 * Dashboard de negocio (estilo Power BI).
 *
 * Muestra de un vistazo cómo va la tienda:
 *  - KPIs: ventas hoy, semana, mes, ticket promedio.
 *  - Tendencia 14 días (sparkline / barras).
 *  - Top productos del mes (ranking con barras).
 *  - Deudas pendientes (clientes que deben).
 *  - Stock bajo (productos por reabastecer).
 *  - Distribución de pagos por moneda y método.
 *
 * Solo admin/superadmin (backend lo valida con @Roles).
 */

interface DashboardData {
  generadoEn: string;
  moneda: 'USD';
  ventas: {
    hoy: { totalUsd: number; cantidad: number };
    semana: { totalUsd: number; cantidad: number };
    mes: { totalUsd: number; cantidad: number };
    ticketPromedio: number;
  };
  topProductos: Array<{
    productId: string;
    nombre: string;
    unidades: number;
    totalUsd: number;
  }>;
  deudas: { cantidad: number; totalSaldoUsd: number };
  stockBajo: number;
  distribucion: {
    porMoneda: Array<{ currency: string; totalUsd: number; cantidad: number }>;
    porMetodo: Array<{ method: string; totalUsd: number; cantidad: number }>;
  };
  serieDiaria: Array<{ fecha: string; total: number; cantidad: number }>;
}

export default function ReportesPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tasas, setTasas] = useState<CurrentRates | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [dias, setDias] = useState(14);

  const cargar = async (silent = false) => {
    if (!silent) setCargando(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get<DashboardData>('/api/negocio/sales/reports/dashboard'),
        api.get<CurrentRates>('/api/negocio/exchange-rates/current'),
      ]);
      setData(r1.data);
      setTasas(r2.data);
      setError('');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Error cargando dashboard',
      );
    } finally {
      if (!silent) setCargando(false);
    }
  };

  // App en tiempo real: en vez de un boton "Actualizar", el reporte se refresca
  // solo en silencio cada 30s (los datos de negocio viajan por REST, no socket).
  useEffect(() => {
    cargar();
    const id = setInterval(() => cargar(true), 30_000);
    return () => clearInterval(id);
  }, []);

  if (cargando) {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert tone="danger" title="No se pudo cargar el dashboard">
        {error || 'Sin datos'}
      </Alert>
    );
  }

  return (
    <div>
      <PageHeader
        icon={<BarChart3 size={22} strokeWidth={1.75} />}
        title="Reportes del negocio"
        subtitle={`Actualizado ${new Date(data.generadoEn).toLocaleTimeString()} · en vivo`}
      />

      {/* KPIs grandes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icono={<CalendarDays size={20} strokeWidth={1.75} />}
          label="Ventas hoy"
          valor={`$${data.ventas.hoy.totalUsd.toFixed(2)}`}
          sub={`${data.ventas.hoy.cantidad} ventas`}
          tasas={tasas}
          equivUsd={data.ventas.hoy.totalUsd}
        />
        <KpiCard
          icono={<TrendingUp size={20} strokeWidth={1.75} />}
          label="Últimos 7 días"
          valor={`$${data.ventas.semana.totalUsd.toFixed(2)}`}
          sub={`${data.ventas.semana.cantidad} ventas`}
          tasas={tasas}
          equivUsd={data.ventas.semana.totalUsd}
        />
        <KpiCard
          icono={<CalendarRange size={20} strokeWidth={1.75} />}
          label="Mes actual"
          valor={`$${data.ventas.mes.totalUsd.toFixed(2)}`}
          sub={`${data.ventas.mes.cantidad} ventas`}
          tasas={tasas}
          equivUsd={data.ventas.mes.totalUsd}
        />
        <KpiCard
          icono={<Target size={20} strokeWidth={1.75} />}
          label="Ticket promedio"
          valor={`$${data.ventas.ticketPromedio.toFixed(2)}`}
          sub="Por venta este mes"
        />
      </div>

      {/* Alertas operativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AlertCard
          tone={data.deudas.cantidad > 0 ? 'warning' : 'success'}
          titulo={
            data.deudas.cantidad > 0
              ? `${data.deudas.cantidad} cliente${data.deudas.cantidad === 1 ? '' : 's'} con deudas`
              : 'Sin deudas pendientes'
          }
          subtitulo={
            data.deudas.cantidad > 0
              ? `Saldo total: $${data.deudas.totalSaldoUsd.toFixed(2)} USD`
              : 'Todas las ventas a crédito están saldadas'
          }
          cta={data.deudas.cantidad > 0 ? 'Ver deudas' : undefined}
          ctaHref="/ventas?deudas"
        />
        <AlertCard
          tone={data.stockBajo > 0 ? 'danger' : 'success'}
          titulo={
            data.stockBajo > 0
              ? `${data.stockBajo} producto${data.stockBajo === 1 ? '' : 's'} con stock bajo`
              : 'Stock saludable'
          }
          subtitulo={
            data.stockBajo > 0
              ? 'Reabastecer pronto'
              : 'Ningún producto bajo el mínimo'
          }
          cta={data.stockBajo > 0 ? 'Ver inventario' : undefined}
          ctaHref="/inventario"
        />
      </div>

      {/* Tendencia */}
      <SeccionCard titulo={`Tendencia últimos ${dias} días`} subtitulo="Ventas por día (USD)">
        <div className="flex gap-2 mb-4">
          {[7, 14].map((n) => (
            <Chip key={n} active={dias === n} onClick={() => setDias(n)}>
              {n} días
            </Chip>
          ))}
        </div>
        <SeriesBarras data={padSerie(data.serieDiaria, dias)} />
      </SeccionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Top productos */}
        <SeccionCard
          titulo="Top productos del mes"
          subtitulo="Por unidades vendidas">
          {data.topProductos.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-6">
              Aún no hay ventas este mes.
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const max = Math.max(...data.topProductos.map((p) => p.unidades));
                return data.topProductos.map((p, idx) => (
                  <div key={p.productId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate flex-1 mr-2">
                        <span className="text-text-muted mr-2">#{idx + 1}</span>
                        {p.nombre}
                      </span>
                      <span className="text-text-muted whitespace-nowrap">
                        <strong>{p.unidades}u</strong> · ${p.totalUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-fill"
                        style={{ width: `${(p.unidades / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </SeccionCard>

        {/* Distribución por moneda */}
        <SeccionCard
          titulo="Por moneda recibida"
          subtitulo="Mes actual (en USD)">
          <DistribucionLista
            items={data.distribucion.porMoneda.map((m) => ({
              label: m.currency,
              total: m.totalUsd,
              cantidad: m.cantidad,
            }))}
            color="bg-accent-fill"
          />
        </SeccionCard>
      </div>

      {/* Distribución por método */}
      <div className="mt-5">
        <SeccionCard
          titulo="Métodos de pago más usados"
          subtitulo="Mes actual (en USD)">
          <DistribucionLista
            items={data.distribucion.porMetodo.map((m) => ({
              label: formatMetodo(m.method),
              total: m.totalUsd,
              cantidad: m.cantidad,
            }))}
            color="bg-accent-fill"
          />
        </SeccionCard>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function formatMetodo(m: string) {
  if (m === 'pago_movil') return 'Pago móvil';
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function KpiCard({
  icono,
  label,
  valor,
  sub,
  tasas,
  equivUsd,
}: {
  icono: React.ReactNode;
  label: string;
  valor: string;
  sub: string;
  tasas?: CurrentRates | null;
  equivUsd?: number;
}) {
  return (
    <UiKpiCard
      icon={icono}
      label={label}
      value={valor}
      sub={
        <>
          {sub}
          {tasas?.VES && equivUsd !== undefined && equivUsd > 0 && (
            <span className="block text-xs text-text-muted mt-1">
              ≈ {(equivUsd * tasas.VES).toLocaleString()} Bs
            </span>
          )}
        </>
      }
    />
  );
}

function AlertCard({
  tone,
  titulo,
  subtitulo,
  cta,
  ctaHref,
}: {
  tone: Tone;
  titulo: string;
  subtitulo: string;
  cta?: string;
  ctaHref?: string;
}) {
  const navigate = useNavigate();
  const inner = (
    <Alert tone={tone as 'success' | 'warning' | 'danger' | 'info'} title={titulo}>
      <div className="flex items-center justify-between gap-3">
        <span>{subtitulo}</span>
        {cta && (
          <span className="text-xs font-bold text-accent whitespace-nowrap shrink-0">
            {cta} →
          </span>
        )}
      </div>
    </Alert>
  );

  // Si hay destino, TODA la tarjeta navega (no solo el texto del CTA).
  if (cta && ctaHref) {
    return (
      <button
        type="button"
        onClick={() => navigate(ctaHref)}
        className="block w-full text-left rounded-xl transition hover:ring-2 hover:ring-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {inner}
      </button>
    );
  }
  return inner;
}

function SeccionCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-3">
        <h3 className="font-heading font-bold text-sm text-text">{titulo}</h3>
        {subtitulo && (
          <p className="text-xs text-text-muted mt-0.5">{subtitulo}</p>
        )}
      </div>
      {children}
    </Card>
  );
}

// Rellena la serie a los ultimos `dias` dias (dias sin ventas -> 0) para que
// el grafico muestre una tendencia real y no una sola barra gigante.
function padSerie(
  serie: Array<{ fecha: string; total: number; cantidad: number }>,
  dias: number,
): Array<{ fecha: string; total: number; cantidad: number }> {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const map = new Map(serie.map((s) => [s.fecha.slice(0, 10), s]));
  const hoy = new Date();
  const out: Array<{ fecha: string; total: number; cantidad: number }> = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const key = fmt(d);
    const found = map.get(key);
    out.push({ fecha: key, total: found?.total ?? 0, cantidad: found?.cantidad ?? 0 });
  }
  return out;
}

function SeriesBarras({
  data,
}: {
  data: Array<{ fecha: string; total: number; cantidad: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-text-muted text-center py-8">
        Sin ventas en los últimos 14 días.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  const ALTO = 150; // px de la zona de barras (antes era % sobre un alto sin definir -> colapsaba a 0)
  return (
    <div className="flex gap-1 items-end" style={{ height: ALTO + 22 }}>
      {data.map((d) => {
        const h = (d.total / max) * ALTO;
        const fechaCorta = d.fecha.slice(5);
        return (
          <div
            key={d.fecha}
            className="flex-1 flex flex-col items-center justify-end min-w-0 group relative">
            <div
              className="w-full bg-accent-fill rounded-t-sm transition hover:opacity-80"
              style={{ height: Math.max(h, 3) }}
              title={`${d.fecha}: $${d.total.toFixed(2)} · ${d.cantidad} ventas`}
            />
            <div className="text-[9px] text-text-muted mt-1 truncate w-full text-center">
              {fechaCorta}
            </div>
            {d.total > 0 && (
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-text text-bg text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                ${d.total.toFixed(2)} · {d.cantidad}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DistribucionLista({
  items,
  color,
}: {
  items: Array<{ label: string; total: number; cantidad: number }>;
  color: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-text-muted text-center py-6">Sin datos.</div>
    );
  }
  const total = items.reduce((acc, i) => acc + i.total, 0);
  return (
    <div className="space-y-3">
      {items.map((i) => {
        const pct = total > 0 ? (i.total / total) * 100 : 0;
        return (
          <div key={i.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold capitalize">{i.label}</span>
              <span className="text-text-muted">
                <strong>${i.total.toFixed(2)}</strong> · {pct.toFixed(0)}% ·{' '}
                {i.cantidad} pago{i.cantidad === 1 ? '' : 's'}
              </span>
            </div>
            <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
              <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
