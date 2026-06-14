import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ClienteFormModal from '../components/ClienteFormModal';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { Customer, customersService } from '../services/customers.service';
import { pedirConfirmacionYDesactivar } from '../utils/clienteActions';
import { COLORS } from '../utils/constants';
import { parseApiError } from '../utils/errors';

type ClientesStackParamList = {
  Clientes: undefined;
  ClienteDetalle: { id: string };
};
type Nav = StackNavigationProp<ClientesStackParamList>;

type FiltroEstado = 'activos' | 'inactivos' | 'todos';
const FILTROS: { value: FiltroEstado; label: string }[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

/**
 * Pantalla de Clientes / Deudores (mobile).
 *
 * Lista, busca, filtra por estado y permite crear/desactivar.
 * Tap en un card abre la pantalla de detalle con historial completo.
 * Solo admin/superadmin pueden crear o desactivar.
 */
export default function ClientesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const puedeEditar = user?.role === 'admin' || user?.role === 'superadmin';

  const [items, setItems] = useState<Customer[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('activos');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const incluirInactivos = filtro !== 'activos';
      const lista = await customersService.list(
        busqueda || undefined,
        incluirInactivos,
      );
      setItems(lista);
    } catch (err) {
      RNAlert.alert('Error', parseApiError(err, 'No se pudo cargar'));
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    if (filtro === 'inactivos') return items.filter((c) => !c.activo);
    return items;
  }, [items, filtro]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const onDesactivar = (c: Customer) => {
    pedirConfirmacionYDesactivar({ id: c.id, nombre: c.nombre }, () => {
      void cargar();
    });
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitulo}>
          {visibles.length} {visibles.length === 1 ? 'cliente' : 'clientes'}
        </Text>
        {puedeEditar && (
          <TouchableOpacity style={styles.btnAdd} onPress={() => setCreando(true)}>
            <Text style={styles.btnAddTxt}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtros}>
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, filtro === f.value && styles.chipActivo]}
            onPress={() => setFiltro(f.value)}>
            <Text
              style={[
                styles.chipTxt,
                filtro === f.value && styles.chipTxtActivo,
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por cédula o nombre..."
        placeholderTextColor={COLORS.textMuted}
        value={busqueda}
        onChangeText={setBusqueda}
      />

      <FlatList
        data={visibles}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.vacio}>Sin clientes para este filtro.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.activo && styles.cardInactivo]}
            onPress={() => navigation.navigate('ClienteDetalle', { id: item.id })}>
            <View style={{ flex: 1 }}>
              <Text
                style={styles.nombre}
                numberOfLines={1}
                ellipsizeMode="tail">
                {item.nombre}
              </Text>
              <Text style={styles.cedula}>{item.cedula}</Text>
              {item.telefono && (
                <View style={styles.detalleRow}>
                  <Icon name="perfil" color={COLORS.textMuted} size={12} />
                  <Text style={styles.detalle}>{item.telefono}</Text>
                </View>
              )}
            </View>
            {!item.activo && (
              <Text style={styles.badgeInactivo}>INACTIVO</Text>
            )}
            {puedeEditar && item.activo && (
              <TouchableOpacity
                onPress={() => onDesactivar(item)}
                hitSlop={8}
                style={styles.delBtn}>
                <Icon name="cerrar" color={COLORS.danger} size={16} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {creando && (
        <ClienteFormModal
          cliente={null}
          onCerrar={() => setCreando(false)}
          onGuardado={() => {
            setCreando(false);
            void cargar();
          }}
        />
      )}
    </View>
  );
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subtitulo: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  btnAdd: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnAddTxt: { color: COLORS.accentContrast, fontWeight: '600' },
  filtros: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActivo: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipTxt: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  chipTxtActivo: { color: COLORS.accentContrast },
  searchInput: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.text,
  },
  lista: { padding: 16, paddingTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardInactivo: { opacity: 0.6 },
  nombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cedula: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  detalleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  detalle: { fontSize: 12, color: COLORS.textMuted },
  badgeInactivo: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingTop: 30,
    fontSize: 13,
  },
});
