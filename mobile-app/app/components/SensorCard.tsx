import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';
import type { SensorReading } from '../services/iot.service';

/**
 * Tarjeta de visualizacion de una lectura de sensor.
 * Colorea el valor segun el tipo y umbral basico.
 */
const ICONOS: Record<string, string> = {
  temperatura: '🌡️',
  humedad: '💧',
  puerta: '🚪',
  movimiento: '🏃',
  gas: '💨',
  buzzer: '🔊',
};

function colorValor(tipo: string, valor: number): string {
  if (tipo === 'temperatura' && valor > 28) return COLORS.danger;
  if (tipo === 'humedad' && (valor < 30 || valor > 75)) return COLORS.warning;
  if ((tipo === 'puerta' || tipo === 'gas' || tipo === 'buzzer') && valor === 1) {
    return COLORS.danger;
  }
  if (tipo === 'movimiento' && valor === 1) return COLORS.warning;
  return COLORS.success;
}

function formatearValor(tipo: string, valor: number, unidad: string): string {
  if (tipo === 'puerta') return valor === 1 ? 'Abierta' : 'Cerrada';
  if (tipo === 'movimiento') return valor === 1 ? 'Detectado' : 'Sin actividad';
  if (tipo === 'gas') return valor === 1 ? 'ALARMA' : 'Limpio';
  if (tipo === 'buzzer') return valor === 1 ? 'Sonando' : 'Silencio';
  return `${valor}${unidad ? ' ' + unidad : ''}`;
}

interface Props {
  lectura: SensorReading;
}

export default function SensorCard({ lectura }: Props) {
  const icono = ICONOS[lectura.tipo] ?? '📡';
  const color = colorValor(lectura.tipo, lectura.valor);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icono}>{icono}</Text>
        <Text style={styles.tipo}>{lectura.tipo.toUpperCase()}</Text>
      </View>
      <Text style={[styles.valor, { color }]}>
        {formatearValor(lectura.tipo, lectura.valor, lectura.unidad)}
      </Text>
      <Text style={styles.sensor}>{lectura.sensorId}</Text>
      <Text style={styles.fecha}>{new Date(lectura.fecha).toLocaleTimeString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icono: { fontSize: 20, marginRight: 8 },
  tipo: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  valor: { fontSize: 28, fontWeight: 'bold', marginVertical: 4 },
  sensor: { fontSize: 12, color: COLORS.textMuted },
  fecha: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
});
