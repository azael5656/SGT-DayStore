import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SensorCard from '../components/SensorCard';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import { COLORS } from '../utils/constants';
import type { SensorReading } from '../services/iot.service';

/**
 * Pantalla de dashboard para el duenio de la tienda.
 *
 * 100% realtime via Socket.IO: los datos se actualizan en cuanto el
 * backend emite un evento, sin polling.
 */
export default function DashboardScreen() {
  const { readings, alerts, conectado } = useRealtimeIoT();

  const resumen = useMemo(() => computarResumen(readings, alerts.length), [readings, alerts.length]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.titulo}>Resumen</Text>
        <View style={[styles.estado, conectado ? styles.estadoOn : styles.estadoOff]}>
          <Text style={styles.estadoTxt}>{conectado ? '● EN VIVO' : '○ desconectado'}</Text>
        </View>
      </View>

      <View style={styles.gridResumen}>
        <Metrica
          label="Temperatura"
          valor={resumen.temperatura !== null ? `${resumen.temperatura}°C` : '—'}
          acento={
            resumen.temperatura !== null && resumen.temperatura > 28
              ? COLORS.danger
              : COLORS.success
          }
        />
        <Metrica
          label="Humedad"
          valor={resumen.humedad !== null ? `${resumen.humedad}%` : '—'}
        />
        <Metrica
          label="Puerta"
          valor={resumen.puertaAbierta ? 'Abierta' : 'Cerrada'}
          acento={resumen.puertaAbierta ? COLORS.danger : COLORS.success}
        />
        <Metrica
          label="Movimiento"
          valor={resumen.movimientoReciente ? 'Reciente' : 'Tranquilo'}
          acento={resumen.movimientoReciente ? COLORS.warning : COLORS.success}
        />
        <Metrica
          label="Gas/Humo"
          valor={resumen.gas ? 'ALARMA' : 'Limpio'}
          acento={resumen.gas ? COLORS.danger : COLORS.success}
        />
        <Metrica
          label="Buzzer"
          valor={resumen.buzzer ? 'Sonando' : 'Silencio'}
          acento={resumen.buzzer ? COLORS.danger : COLORS.success}
        />
        <Metrica
          label="Sensores activos"
          valor={String(readings.length)}
        />
        <Metrica
          label="Alertas sin revisar"
          valor={String(alerts.filter((a) => !a.reconocida).length)}
          acento={
            alerts.filter((a) => !a.reconocida).length > 0
              ? COLORS.danger
              : COLORS.success
          }
        />
      </View>

      <Text style={styles.titulo}>Ultimas lecturas</Text>

      {readings.length === 0 ? (
        <Text style={styles.vacio}>Esperando primeras lecturas del simulador...</Text>
      ) : (
        readings.map((l) => (
          <SensorCard key={l.sensorId + l.fecha} lectura={l} />
        ))
      )}
    </ScrollView>
  );
}

interface MetricaProps {
  label: string;
  valor: string;
  acento?: string;
}

function Metrica({ label, valor, acento = COLORS.primary }: MetricaProps) {
  return (
    <View style={[styles.metrica, { borderLeftColor: acento }]}>
      <Text style={styles.metricaLabel}>{label}</Text>
      <Text style={[styles.metricaValor, { color: acento }]}>{valor}</Text>
    </View>
  );
}

function computarResumen(readings: SensorReading[], _alertCount: number) {
  const porTipo: Record<string, SensorReading> = {};
  for (const r of readings) {
    const previa = porTipo[r.tipo];
    if (!previa || r.fecha > previa.fecha) porTipo[r.tipo] = r;
  }
  const haceUnMinuto = Date.now() - 60_000;
  const movReciente =
    porTipo.movimiento &&
    porTipo.movimiento.valor === 1 &&
    new Date(porTipo.movimiento.fecha).getTime() >= haceUnMinuto;
  return {
    temperatura: porTipo.temperatura?.valor ?? null,
    humedad: porTipo.humedad?.valor ?? null,
    puertaAbierta: porTipo.puerta?.valor === 1,
    movimientoReciente: Boolean(movReciente),
    gas: porTipo.gas?.valor === 1,
    buzzer: porTipo.buzzer?.valor === 1,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
  },
  estado: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoOn: { backgroundColor: '#DCFCE7' },
  estadoOff: { backgroundColor: '#FEE2E2' },
  estadoTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  gridResumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metrica: {
    width: '47%',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricaLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricaValor: { fontSize: 20, fontWeight: 'bold' },
  vacio: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
