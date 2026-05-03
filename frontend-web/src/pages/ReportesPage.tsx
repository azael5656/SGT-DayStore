import { useEffect, useState } from 'react';
import api from '../api/client';
import type { CurrentRates } from '../types';

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

  const cargar = async () => {
    setCargando(true);
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
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  if (cargando) {
    return (
      <div className="p-8 text-center text-gray-500">
        Cargando dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        {error || 'Sin datos'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">📊 Reportes del negocio</h1>
          <p className="text-xs text-gray-500 mt-1">
            Generado: {new Date(data.generadoEn).toLocaleString()}
          </p>
        </div>
        <button
          onClick={cargar}
          className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200">
          🔄 Actualizar
        </button>
      </div>

      {/* KPIs grandes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          color="blue"
          icono="📅"
          label="Ventas hoy"
          valor={`$${data.ventas.hoy.totalUsd.toFixed(2)}`}
          sub={`${data.ventas.hoy.cantidad} ventas`}
          tasas={tasas}
          equivUsd={data.ventas.hoy.totalUsd}
        />
        <KpiCard
          color="purple"
          icono="📈"
          label="Últimos 7 días"
          valor={`$${data.ventas.semana.totalUsd.toFixed(2)}`}
          sub={`${data.ventas.semana.cantidad} ventas`}
          tasas={tasas}
          equivUsd={data.ventas.semana.totalUsd}
        />
        <KpiCard
          color="green"
          icono="🗓️"
          label="Mes actual"
          valor={`$${data.ventas.mes.totalUsd.toFixed(2)}`}
          sub={`${data.ventas.mes.cantidad} ventas`}
          tasas={tasas}
          equivUsd={data.ventas.mes.totalUsd}
        />
        <KpiCard
          color="amber"
          icono="🎯"
          label="Ticket promedio"
          valor={`$${data.ventas.ticketPromedio.toFixed(2)}`}
          sub="Por venta este mes"
        />
      </div>

      {/* Alertas operativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AlertCard
          color={data.deudas.cantidad > 0 ? 'amber' : 'green'}
          icono={data.deudas.cantidad > 0 ? '💰' : '✅'}
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
          color={data.stockBajo > 0 ? 'red' : 'green'}
          icono={data.stockBajo > 0 ? '📦' : '✅'}
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

      {/* Tendencia 14 días */}
      <SeccionCard titulo="📊 Tendencia últimos 14 días" subtitulo="Ventas por día (USD)">
        <SeriesBarras data={data.serieDiaria} />
      </SeccionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Top productos */}
        <SeccionCard
          titulo="🏆 Top productos del mes"
          subtitulo="Por unidades vendidas">
          {data.topProductos.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-6">
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
                        <span className="text-gray-400 mr-2">#{idx + 1}</span>
                        {p.nombre}
                      </span>
                      <span className="text-gray-600 whitespace-nowrap">
                        <strong>{p.unidades}u</strong> · ${p.totalUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
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
          titulo="💱 Por moneda recibida"
          subtitulo="Mes actual (en USD)">
          <DistribucionLista
            items={data.distribucion.porMoneda.map((m) => ({
              label: m.currency,
              total: m.totalUsd,
              cantidad: m.cantidad,
            }))}
            color="bg-blue-500"
          />
        </SeccionCard>
      </div>

      {/* Distribución por método */}
      <div className="mt-5">
        <SeccionCard
          titulo="💳 Métodos de pago más usados"
          subtitulo="Mes actual (en USD)">
          <DistribucionLista
            items={data.distribucion.porMetodo.map((m) => ({
              label: formatMetodo(m.method),
              total: m.totalUsd,
              cantidad: m.cantidad,
            }))}
            color="bg-purple-500"
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

const COLORES = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-700' },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    accent: 'text-purple-700',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    accent: 'text-green-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'text-amber-700',
  },
  red: { bg: 'bg-red-50', border: 'border-red-200', accent: 'text-red-700' },
};

function KpiCard({
  color,
  icono,
  label,
  valor,
  sub,
  tasas,
  equivUsd,
}: {
  color: keyof typeof COLORES;
  icono: string;
  label: string;
  valor: string;
  sub: string;
  tasas?: CurrentRates | null;
  equivUsd?: number;
}) {
  const c = COLORES[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className="text-2xl">{icono}</div>
      <div className="text-xs uppercase font-bold text-gray-600 mt-2 tracking-wide">
        {label}
      </div>
      <div className={`text-2xl font-extrabold mt-1 ${c.accent}`}>{valor}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
      {tasas?.VES && equivUsd !== undefined && equivUsd > 0 && (
        <div className="text-[10px] text-gray-400 mt-1">
          ≈ {(equivUsd * tasas.VES).toLocaleString()} Bs
        </div>
      )}
    </div>
  );
}

function AlertCard({
  color,
  icono,
  titulo,
  subtitulo,
  cta,
  ctaHref,
}: {
  color: keyof typeof COLORES;
  icono: string;
  titulo: string;
  subtitulo: string;
  cta?: string;
  ctaHref?: string;
}) {
  const c = COLORES[color];
  return (
    <div
      className={`rounded-xl border p-4 ${c.bg} ${c.border} flex items-center gap-3`}>
      <div className="text-3xl">{icono}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-sm ${c.accent}`}>{titulo}</div>
        <div className="text-xs text-gray-600 mt-0.5">{subtitulo}</div>
      </div>
      {cta && ctaHref && (
        <a
          href={ctaHref}
          className="text-xs font-bold text-primary hover:underline whitespace-nowrap">
          {cta} →
        </a>
      )}
    </div>
  );
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
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-3">
        <h3 className="font-bold text-sm">{titulo}</h3>
        {subtitulo && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function SeriesBarras({
  data,
}: {
  data: Array<{ fecha: string; total: number; cantidad: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Sin ventas en los últimos 14 días.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex gap-1 items-end h-40">
      {data.map((d) => {
        const h = (d.total / max) * 100;
        const fechaCorta = d.fecha.slice(5);
        return (
          <div
            key={d.fecha}
            className="flex-1 flex flex-col items-center min-w-0 group relative">
            <div
              className="w-full bg-gradient-to-t from-primary to-blue-400 rounded-t-sm transition hover:opacity-80"
              style={{ height: `${Math.max(h, 2)}%` }}
              title={`${d.fecha}: $${d.total.toFixed(2)} · ${d.cantidad} ventas`}
            />
            <div className="text-[9px] text-gray-500 mt-1 truncate w-full text-center">
              {fechaCorta}
            </div>
            {d.total > 0 && (
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
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
      <div className="text-sm text-gray-500 text-center py-6">Sin datos.</div>
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
              <span className="text-gray-600">
                <strong>${i.total.toFixed(2)}</strong> · {pct.toFixed(0)}% ·{' '}
                {i.cantidad} pago{i.cantidad === 1 ? '' : 's'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
