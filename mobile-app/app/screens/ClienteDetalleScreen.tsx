import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ClienteFormModal from '../components/ClienteFormModal';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import {
  AuditLogItem,
  Customer,
  customersService,
  HistorialCliente,
  SaleHistorial,
  SalePaymentHistorial,
} from '../services/customers.service';
import { pedirConfirmacionYDesactivar } from '../utils/clienteActions';
import { COLORS } from '../utils/constants';
import { parseApiError } from '../utils/errors';

type ParamList = {
  ClienteDetalle: { id: string };
  Clientes: undefined;
};
type Nav = StackNavigationProp<ParamList>;
type DetalleRoute = RouteProp<ParamList, 'ClienteDetalle'>;

type Tab = 'ventas' | 'abonos' | 'auditoria';

const ESTADO_COLOR: Record<string, { bg: string; fg: string }> = {
  pendiente: { bg: COLORS.surfaceAlt, fg: COLORS.warning },
  completada: { bg: COLORS.surfaceAlt, fg: COLORS.success },
  anulada: { bg: COLORS.surfaceAlt, fg: COLORS.textMuted },
};

const ACTION_LABEL: Record<string, string> = {
  'customer.create': 'Creó el cliente',
  'customer.update': 'Editó datos',
  'customer.deactivate': 'Desactivó el cliente',
  'customer.reactivate': 'Reactivó el cliente',
  'sale.cancelled-on-customer-deactivation': 'Anuló venta al desactivar',
};

/**
 * Pantalla de detalle del cliente. Muestra deuda viva, ventas con sus
 * abonos, y auditoría. Permite editar, desactivar (con flujo de
 * confirmación si tiene deudas) y reactivar.
 */
export default function ClienteDetalleScreen() {
  const route = useRoute<DetalleRoute>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';
  const id = route.params.id;

  const [historial, setHistorial] = useState<HistorialCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<Tab>('ventas');
  const [editando, setEditando] = useState(false);
  const [reactivando, setReactivando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const h = await customersService.getHistorial(id);
      setHistorial(h);
    } catch (err) {
      RNAlert.alert('Error', parseApiError(err, 'No se pudo cargar el historial'));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onDesactivar = () => {
    if (!historial) return;
    pedirConfirmacionYDesactivar(
      { id: historial.cliente.id, nombre: historial.cliente.nombre },
      () => {
        void cargar();
      },
    );
  };

  const onReactivar = async () => {
    if (!historial) return;
    setReactivando(true);
    try {
      await customersService.activar(historial.cliente.id);
      await cargar();
    } catch (err) {
      RNAlert.alert('Error', parseApiError(err, 'No se pudo reactivar'));
    } finally {
      setReactivando(false);
    }
  };

  const onEditadoOk = (actualizado: Customer) => {
    setEditando(false);
    setHistorial((h) => (h ? { ...h, cliente: actualizado } : h));
  };

  if (cargando || !historial) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const { cliente, resumen, ventas, auditoria } = historial;
  const abonos = aplastarAbonos(ventas);
  const deuda = Number(resumen.deudaTotalUsd);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre} numberOfLines={2} ellipsizeMode="tail">
              {cliente.nombre}
            </Text>
            <Text style={styles.cedula}>{cliente.cedula}</Text>
            {cliente.telefono ? (
              <View style={styles.contactoRow}>
                <Icon name="clientes" color={COLORS.textMuted} size={14} />
                <Text style={styles.contacto}>{cliente.telefono}</Text>
              </View>
            ) : null}
            {cliente.email ? (
              <View style={styles.contactoRow}>
                <Icon name="perfil" color={COLORS.textMuted} size={14} />
                <Text style={styles.contacto}>{cliente.email}</Text>
              </View>
            ) : null}
            {!cliente.activo && (
              <View style={styles.badgeInactivo}>
                <Text style={styles.badgeInactivoTxt}>INACTIVO</Text>
              </View>
            )}
          </View>
          {puedeEditar && (
            <TouchableOpacity
              onPress={() => setEditando(true)}
              style={styles.btnEditar}>
              <Text style={styles.btnEditarTxt}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {deuda > 0 && (
          <View style={styles.banner}>
            <View style={styles.bannerTituloRow}>
              <Icon name="tasas" color={COLORS.warning} size={18} />
              <Text style={styles.bannerTitulo}>
                Deuda total: ${resumen.deudaTotalUsd}
              </Text>
            </View>
            <Text style={styles.bannerSub}>
              {resumen.ventasPendientes} venta(s) pendiente(s)
            </Text>
          </View>
        )}

        <View style={styles.kpis}>
          <Kpi label="Pendientes" valor={resumen.ventasPendientes} />
          <Kpi label="Completadas" valor={resumen.ventasCompletadas} />
          <Kpi label="Anuladas" valor={resumen.ventasAnuladas} />
        </View>

        <View style={styles.tabs}>
          <TabBtn label={`Ventas (${ventas.length})`} active={tab === 'ventas'} onPress={() => setTab('ventas')} />
          <TabBtn label={`Abonos (${abonos.length})`} active={tab === 'abonos'} onPress={() => setTab('abonos')} />
          <TabBtn label={`Auditoría (${auditoria.length})`} active={tab === 'auditoria'} onPress={() => setTab('auditoria')} />
        </View>

        {tab === 'ventas' && <ListaVentas data={ventas} />}
        {tab === 'abonos' && <ListaAbonos data={abonos} />}
        {tab === 'auditoria' && <ListaAuditoria data={auditoria} />}
      </ScrollView>

      {puedeEditar && (
        <View style={styles.footer}>
          {cliente.activo ? (
            <TouchableOpacity onPress={onDesactivar} style={styles.btnDanger}>
              <Text style={styles.btnDangerTxt}>Desactivar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onReactivar}
              disabled={reactivando}
              style={[styles.btnPrimary, reactivando && { opacity: 0.5 }]}>
              <Text style={styles.btnPrimaryTxt}>
                {reactivando ? 'Reactivando...' : 'Reactivar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {editando && (
        <ClienteFormModal
          cliente={cliente}
          onCerrar={() => setEditando(false)}
          onGuardado={onEditadoOk}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------
// Subcomponentes simples
// ---------------------------------------------------------------------

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValor}>{valor}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ListaVentas({ data }: { data: SaleHistorial[] }) {
  if (data.length === 0) {
    return <Text style={styles.vacio}>Sin ventas registradas.</Text>;
  }
  return (
    <FlatList
      data={data}
      scrollEnabled={false}
      keyExtractor={(s) => s.id}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      contentContainerStyle={styles.listaInner}
      renderItem={({ item }) => {
        const c = ESTADO_COLOR[item.estado] ?? ESTADO_COLOR.completada;
        return (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitulo}>${item.total} · {item.tipoVenta}</Text>
              <Text style={styles.rowSub}>
                {new Date(item.fecha).toLocaleDateString()} · saldo ${item.saldoUsd}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: c.bg }]}>
              <Text style={[styles.badgeTxt, { color: c.fg }]}>
                {item.estado.toUpperCase()}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

function ListaAbonos({ data }: { data: SalePaymentHistorial[] }) {
  if (data.length === 0) {
    return <Text style={styles.vacio}>Sin abonos registrados.</Text>;
  }
  return (
    <FlatList
      data={data}
      scrollEnabled={false}
      keyExtractor={(p) => p.id}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      contentContainerStyle={styles.listaInner}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitulo}>
              {item.amount} {item.currency} · {item.method}
            </Text>
            <Text style={styles.rowSub}>
              {new Date(item.fecha).toLocaleDateString()} · ${item.amountUsd} USD
            </Text>
          </View>
        </View>
      )}
    />
  );
}

function ListaAuditoria({ data }: { data: AuditLogItem[] }) {
  if (data.length === 0) {
    return <Text style={styles.vacio}>Sin eventos de auditoría.</Text>;
  }
  return (
    <FlatList
      data={data}
      scrollEnabled={false}
      keyExtractor={(a) => a.id}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      contentContainerStyle={styles.listaInner}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitulo}>
              {ACTION_LABEL[item.action] ?? item.action}
            </Text>
            <Text style={styles.rowSub}>
              {new Date(item.createdAt).toLocaleString()} ·{' '}
              {item.userEmail ?? 'sistema'}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

function aplastarAbonos(ventas: SaleHistorial[]): SalePaymentHistorial[] {
  const abonos: SalePaymentHistorial[] = [];
  for (const v of ventas) {
    if (v.payments) abonos.push(...v.payments);
  }
  abonos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return abonos;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  nombre: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  cedula: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  contactoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contacto: { fontSize: 13, color: COLORS.textMuted },
  badgeInactivo: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceAlt,
  },
  badgeInactivoTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  btnEditar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnEditarTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  banner: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  bannerTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitulo: { fontSize: 16, fontWeight: '800', color: COLORS.warning },
  bannerSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  kpis: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  kpi: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: 'center',
  },
  kpiValor: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  kpiLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  tabTxtActive: { color: COLORS.accentContrast },
  listaInner: { padding: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowTitulo: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  vacio: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingVertical: 24,
    fontSize: 13,
  },
  footer: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  btnDanger: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.danger,
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDangerTxt: { color: COLORS.danger, fontWeight: '800', fontSize: 14 },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryTxt: { color: COLORS.accentContrast, fontWeight: '800', fontSize: 14 },
});
