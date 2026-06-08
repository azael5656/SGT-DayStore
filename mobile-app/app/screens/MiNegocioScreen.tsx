import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../components/Icon';
import { exchangeRatesService } from '../services/exchangeRates.service';
import { DashboardData, reportesService } from '../services/reportes.service';
import { CurrentRates } from '../services/sales.service';
import { COLORS } from '../utils/constants';

type Nav = StackNavigationProp<{
  VentasDetalle: undefined;
  InventarioTab: undefined;
}>;

/**
 * Dashboard de negocio para mobile.
 *
 * Diseño de tarjetas grandes con KPIs y rankings — el dueño abre la app
 * y de un vistazo sabe cómo va la tienda:
 *  - Ventas hoy / semana / mes con conversiones a Bs.
 *  - Ticket promedio.
 *  - Tendencia 14 días en gráfico de barras.
 *  - Top 5 productos del mes.
 *  - Estado de deudas y stock bajo (con badges de alerta).
 *  - Distribución de pagos por moneda y método.
 *
 * Solo admin/superadmin (el endpoint backend lo valida).
 */
export default function MiNegocioScreen() {
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tasas, setTasas] = useState<CurrentRates | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([
        reportesService.getDashboard(),
        exchangeRatesService.getCurrent(),
      ]);
      setData(d);
      setTasas(t);
    } catch (err) {
      RNAlert.alert(
        'Error cargando dashboard',
        err instanceof Error ? err.message : 'Error desconocido',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centro}>
        <Text>Sin datos</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
      }>
      <Text style={styles.fecha}>
        Actualizado: {new Date(data.generadoEn).toLocaleTimeString()}
      </Text>

      {/* KPI principal: ventas hoy */}
      <View style={styles.kpiHero}>
        <Text style={styles.heroLabel}>VENTAS DE HOY</Text>
        <Text style={styles.heroValor}>
          ${data.ventas.hoy.totalUsd.toFixed(2)}
        </Text>
        <Text style={styles.heroUsd}>USD</Text>
        {tasas?.VES && data.ventas.hoy.totalUsd > 0 && (
          <Text style={styles.heroAlt}>
            ≈ {(data.ventas.hoy.totalUsd * tasas.VES).toLocaleString()} Bs
          </Text>
        )}
        <Text style={styles.heroSub}>
          {data.ventas.hoy.cantidad}{' '}
          {data.ventas.hoy.cantidad === 1 ? 'venta hoy' : 'ventas hoy'}
        </Text>
      </View>

      {/* KPIs secundarios */}
      <View style={styles.kpiRow}>
        <KpiCard
          label="Esta semana"
          icono="tendencias"
          valor={`$${data.ventas.semana.totalUsd.toFixed(0)}`}
          sub={`${data.ventas.semana.cantidad} ventas`}
          color={COLORS.primary}
        />
        <KpiCard
          label="Este mes"
          icono="horario"
          valor={`$${data.ventas.mes.totalUsd.toFixed(0)}`}
          sub={`${data.ventas.mes.cantidad} ventas`}
          color={COLORS.primary}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label="Ticket promedio"
          icono="recibo"
          valor={`$${data.ventas.ticketPromedio.toFixed(2)}`}
          sub="Por venta este mes"
          color={COLORS.primary}
        />
        <KpiCard
          label="Stock bajo"
          icono="inventario"
          valor={`${data.stockBajo}`}
          sub={data.stockBajo === 0 ? 'OK' : 'Reabastecer'}
          color={data.stockBajo > 0 ? COLORS.danger : COLORS.success}
        />
      </View>

      {/* Alerta deudas */}
      {data.deudas.cantidad > 0 ? (
        <TouchableOpacity
          style={styles.alertCard}
          onPress={() => navigation.navigate('VentasDetalle')}>
          <View style={styles.alertIcon}>
            <Icon name="clientes" color={COLORS.warning} size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitulo}>
              {data.deudas.cantidad}{' '}
              {data.deudas.cantidad === 1 ? 'cliente' : 'clientes'} con deudas
            </Text>
            <Text style={styles.alertSub}>
              Saldo total: ${data.deudas.totalSaldoUsd.toFixed(2)} USD
              {tasas?.VES &&
                ` · ${(data.deudas.totalSaldoUsd * tasas.VES).toLocaleString()} Bs`}
            </Text>
          </View>
          <View style={styles.alertChevron}>
            <Icon name="flecha" color={COLORS.warning} size={24} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.alertCard, styles.alertOk]}>
          <View style={styles.alertIcon}>
            <Icon name="check" color={COLORS.success} size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTituloOk}>Sin deudas pendientes</Text>
            <Text style={styles.alertSub}>
              Todas las ventas están saldadas
            </Text>
          </View>
        </View>
      )}

      {/* Tendencia */}
      <Section titulo="Tendencia 14 días" icono="tendencias">
        <Tendencia data={data.serieDiaria} />
      </Section>

      {/* Top productos */}
      <Section titulo="Top productos del mes" icono="figura">
        {data.topProductos.length === 0 ? (
          <Text style={styles.vacio}>Aún no hay ventas este mes.</Text>
        ) : (
          (() => {
            const max = Math.max(...data.topProductos.map((p) => p.unidades));
            return data.topProductos.map((p, idx) => (
              <View key={p.productId} style={styles.rankFila}>
                <View style={styles.rankHeader}>
                  <Text style={styles.rankNombre} numberOfLines={1}>
                    <Text style={styles.rankPos}>#{idx + 1}</Text> {p.nombre}
                  </Text>
                  <Text style={styles.rankInfo}>
                    {p.unidades}u · ${p.totalUsd.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.rankBarBg}>
                  <View
                    style={[
                      styles.rankBarFill,
                      { width: `${(p.unidades / max) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            ));
          })()
        )}
      </Section>

      {/* Distribución por moneda */}
      <Section titulo="Por moneda" icono="cambio">
        <Distribucion
          items={data.distribucion.porMoneda.map((m) => ({
            label: m.currency,
            total: m.totalUsd,
            cantidad: m.cantidad,
          }))}
          color={COLORS.primary}
        />
      </Section>

      {/* Distribución por método */}
      <Section titulo="Por método" icono="credito">
        <Distribucion
          items={data.distribucion.porMetodo.map((m) => ({
            label:
              m.method === 'pago_movil'
                ? 'Pago móvil'
                : m.method.charAt(0).toUpperCase() + m.method.slice(1),
            total: m.totalUsd,
            cantidad: m.cantidad,
          }))}
          color={COLORS.primary}
        />
      </Section>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function KpiCard({
  label,
  icono,
  valor,
  sub,
  color,
}: {
  label: string;
  icono: string;
  valor: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <View style={styles.kpiIcono}>
        <Icon name={icono} color={color} size={18} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValor, { color }]}>{valor}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </View>
  );
}

function Section({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icono && <Icon name={icono} color={COLORS.primary} size={16} />}
        <Text style={styles.sectionTitle}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function Tendencia({
  data,
}: {
  data: Array<{ fecha: string; total: number; cantidad: number }>;
}) {
  if (data.length === 0) {
    return <Text style={styles.vacio}>Sin ventas en el rango.</Text>;
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <View style={styles.tendCont}>
      {data.map((d) => {
        const h = (d.total / max) * 100;
        return (
          <View key={d.fecha} style={styles.tendCol}>
            <View
              style={[
                styles.tendBar,
                { height: `${Math.max(h, 2)}%` },
              ]}
            />
            <Text style={styles.tendFecha}>{d.fecha.slice(8)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Distribucion({
  items,
  color,
}: {
  items: Array<{ label: string; total: number; cantidad: number }>;
  color: string;
}) {
  if (items.length === 0) {
    return <Text style={styles.vacio}>Sin datos.</Text>;
  }
  const total = items.reduce((acc, i) => acc + i.total, 0);
  return (
    <View>
      {items.map((i) => {
        const pct = total > 0 ? (i.total / total) * 100 : 0;
        return (
          <View key={i.label} style={{ marginBottom: 10 }}>
            <View style={styles.distRow}>
              <Text style={styles.distLabel}>{i.label}</Text>
              <Text style={styles.distInfo}>
                ${i.total.toFixed(2)} · {pct.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.distBarBg}>
              <View
                style={[
                  styles.distBarFill,
                  { width: `${pct}%`, backgroundColor: color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  content: { padding: 14, paddingBottom: 30 },
  fecha: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
    textAlign: 'right',
  },
  // Hero
  kpiHero: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  heroValor: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.accentContrast,
    marginTop: 6,
  },
  heroUsd: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  heroAlt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 8,
    fontWeight: '600',
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  // KPI cards
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  kpiIcono: { height: 18, justifyContent: 'center' },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.4,
  },
  kpiValor: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  // Alert card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.warning,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    gap: 12,
  },
  alertOk: { backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.success },
  alertIcon: { height: 28, justifyContent: 'center' },
  alertTitulo: { fontSize: 14, fontWeight: '800', color: COLORS.warning },
  alertTituloOk: { fontSize: 14, fontWeight: '800', color: COLORS.success },
  alertSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  alertChevron: { justifyContent: 'center' },
  // Sections
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  vacio: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingVertical: 12,
    fontSize: 12,
  },
  // Tendencia
  tendCont: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    gap: 3,
  },
  tendCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  tendBar: {
    width: '70%',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tendFecha: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  // Ranking
  rankFila: { marginBottom: 10 },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rankNombre: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  rankPos: { fontWeight: '800', color: COLORS.textMuted, marginRight: 4 },
  rankInfo: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  rankBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  // Distribución
  distRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  distInfo: { fontSize: 11, color: COLORS.textMuted },
  distBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  distBarFill: { height: '100%', borderRadius: 3 },
});
