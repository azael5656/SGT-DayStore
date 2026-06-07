import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';
import type { SensorReading } from '../services/iot.service';
import { labelSensor, labelTipo } from '../utils/labels';

/**
 * Tarjeta de visualizacion de una lectura de sensor.
 * Colorea el valor segun el tipo y umbral basico.
 */
const ICONOS: Record<string, string> = {
  temperatura: '🌡️',
  humedad: '💧',
  puerta: '🚪',
  movimiento: '🏃',
  vibracion: '📳',
  corriente: '⚡',
  buzzer: '🔊',
};

function colorValor(tipo: string, valor: number): string {
  if (tipo === 'temperatura' && valor > 28) return COLORS.danger;
  if (tipo === 'humedad' && (valor < 30 || valor > 75)) return COLORS.warning;
  if ((tipo === 'puerta' || tipo === 'buzzer' || tipo === 'vibracion') && valor === 1) {
    return COLORS.danger;
  }
  if (tipo === 'movimiento' && valor === 1) return COLORS.warning;
  if (tipo === 'corriente' && valor === 0) return COLORS.danger;
  if (tipo === 'corriente' && valor > 400) return COLORS.warning;
  return COLORS.success;
}

function formatearValor(tipo: string, valor: number, unidad: string): string {
  if (tipo === 'puerta') return valor === 1 ? 'Abierta' : 'Cerrada';
  if (tipo === 'movimiento') return valor === 1 ? 'Detectado' : 'Sin actividad';
  if (tipo === 'vibracion') return valor === 1 ? 'GOLPE' : 'Estable';
  if (tipo === 'buzzer') return valor === 1 ? 'Sonando' : 'Silencio';
  if (tipo === 'corriente') return valor === 0 ? 'SIN ENERGIA' : `${valor} W`;
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
        <Text style={styles.tipo}>{labelTipo(lectura.tipo)}</Text>
      </View>
      <Text style={[styles.valor, { color }]}>
        {formatearValor(lectura.tipo, lectura.valor, lectura.unidad)}
      </Text>
      <Text style={styles.sensor}>{labelSensor(lectura.sensorId)}</Text>
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
  icono: { fontSize: 22, marginRight: 10 },
  tipo: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  valor: { fontSize: 30, fontWeight: '800', marginVertical: 4 },
  sensor: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  fecha: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
});
