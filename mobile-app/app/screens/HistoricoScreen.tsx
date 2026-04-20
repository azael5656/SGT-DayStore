import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Sparkline from '../components/Sparkline';
import { historicoService } from '../services/historico.service';
import type { SensorReading } from '../services/iot.service';
import { COLORS } from '../utils/constants';

const TIPOS = [
  { label: 'Temperatura', value: 'temperatura', unidad: '°C' },
  { label: 'Humedad', value: 'humedad', unidad: '%' },
  { label: 'Corriente', value: 'corriente', unidad: 'W' },
  { label: 'Puerta', value: 'puerta', unidad: '' },
  { label: 'Vibracion', value: 'vibracion', unidad: '' },
  { label: 'Movimiento', value: 'movimiento', unidad: '' },
];

export default function HistoricoScreen() {
  const [tipo, setTipo] = useState('temperatura');
  const [items, setItems] = useState<SensorReading[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await historicoService.listar({
        tipo,
        limit: 100,
        page: 1,
      });
      setItems(resp.items);
      setTotal(resp.total);
    } finally {
      setCargando(false);
    }
  }, [tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const tipoActivo = TIPOS.find((t) => t.value === tipo);

  // Sparkline en orden cronologico ascendente, ultimo = mas reciente.
  const valores = useMemo(
    () => [...items].reverse().map((r) => r.valor),
    [items],
  );
  const ultimo = items[0];

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Historico de lecturas</Text>

      <View style={styles.chips}>
        {TIPOS.map((t) => (
          <Pressable
            key={t.value}
            style={[styles.chip, tipo === t.value && styles.chipActive]}
            onPress={() => setTipo(t.value)}>
            <Text
              style={[
                styles.chipText,
                tipo === t.value && styles.chipTextActive,
              ]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.resumen}>
        <View style={{ flex: 1 }}>
          <Text style={styles.resumenLabel}>Ultimo valor</Text>
          <Text style={styles.resumenValor}>
            {ultimo ? `${ultimo.valor}${tipoActivo?.unidad ?? ''}` : '—'}
          </Text>
          <Text style={styles.resumenTotal}>{total} lecturas guardadas</Text>
        </View>
        <Sparkline values={valores} width={150} height={50} />
      </View>

      {cargando && items.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.sensorId + it.fecha}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={cargando} onRefresh={cargar} />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sensor}>{item.sensorId}</Text>
                <Text style={styles.fecha}>
                  {new Date(item.fecha).toLocaleTimeString()} ·{' '}
                  {new Date(item.fecha).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.valor}>
                {item.valor}
                <Text style={styles.unidad}> {item.unidad ?? ''}</Text>
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.vacio}>
              Aun no hay lecturas para este tipo de sensor.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 14 },
  titulo: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  resumen: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    alignItems: 'center',
  },
  resumenLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase' },
  resumenValor: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginVertical: 2 },
  resumenTotal: { fontSize: 11, color: COLORS.textMuted },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  sensor: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  fecha: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  valor: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  unidad: { fontSize: 12, color: COLORS.textMuted, fontWeight: '400' },
  vacio: { textAlign: 'center', color: COLORS.textMuted, marginTop: 30 },
});
