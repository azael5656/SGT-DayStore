import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SensorReading } from '../services/iot.service';
import { COLORS } from '../utils/constants';
import Icon from './Icon';

interface Props {
  readings: SensorReading[];
  conectado: boolean;
  alertasSinRevisar: number;
}

/**
 * Resumen ultra compacto de IoT: 4 chips principales + estado de conexion.
 * Pensado para vivir arriba del home como "pulso" de la tienda.
 */
export default function LiveStats({ readings, conectado, alertasSinRevisar }: Props) {
  const r = useMemo(() => computar(readings), [readings]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Estado de la tienda</Text>
        <View style={[styles.badge, conectado ? styles.on : styles.off]}>
          <Text style={styles.badgeTxt}>{conectado ? '● EN VIVO' : '○ offline'}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <Pill icono="temperatura" label="Temp" valor={r.temp} color={r.tempAlerta ? COLORS.danger : COLORS.success} />
        <Pill icono="humedad" label="Hum" valor={r.hum} color={COLORS.primary} />
        <Pill icono="luz" label="Luz" valor={r.corriente} color={r.corteLuz ? COLORS.danger : COLORS.success} />
        <Pill icono="alertas" label="Alertas" valor={String(alertasSinRevisar)} color={alertasSinRevisar > 0 ? COLORS.danger : COLORS.success} />
      </View>
    </View>
  );
}

interface PillProps {
  icono: string;
  label: string;
  valor: string;
  color: string;
}
function Pill({ icono, label, valor, color }: PillProps) {
  return (
    <View style={styles.pill}>
      <Icon name={icono} color={color} size={20} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pillLabel}>{label}</Text>
        <Text style={[styles.pillValor, { color }]} numberOfLines={1}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

function computar(readings: SensorReading[]) {
  const porTipo: Record<string, SensorReading> = {};
  for (const r of readings) {
    const previa = porTipo[r.tipo];
    if (!previa || r.fecha > previa.fecha) porTipo[r.tipo] = r;
  }
  const temp = porTipo.temperatura?.valor;
  const hum = porTipo.humedad?.valor;
  const corriente = porTipo.corriente?.valor;
  return {
    temp: temp !== undefined ? `${temp}°C` : '—',
    hum: hum !== undefined ? `${hum}%` : '—',
    corriente:
      corriente === undefined
        ? '—'
        : corriente === 0
        ? 'CORTE'
        : `${corriente}W`,
    tempAlerta: temp !== undefined && temp > 28,
    corteLuz: corriente === 0,
  };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titulo: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  on: { backgroundColor: COLORS.success },
  off: { backgroundColor: COLORS.danger },
  badgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: COLORS.accentContrast },
  grid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 8,
    gap: 8,
    width: '48%',
  },
  pillLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  pillValor: { fontSize: 16, fontWeight: '700', marginTop: 2 },
});
