import React, { useMemo } from 'react';
import {
  Alert as RNAlert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SensorCard from '../components/SensorCard';
import { useAuth } from '../context/AuthContext';
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
  const { user, logout } = useAuth();

  const resumen = useMemo(() => computarResumen(readings, alerts.length), [readings, alerts.length]);

  const cerrarSesion = () => {
    RNAlert.alert('Cerrar sesion', `¿Cerrar la sesion de ${user?.email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesion', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Resumen</Text>
          {user && (
            <Text style={styles.subUsuario}>
              {user.nombre || user.email} · {user.role}
            </Text>
          )}
        </View>
        <View style={[styles.estado, conectado ? styles.estadoOn : styles.estadoOff]}>
          <Text style={styles.estadoTxt}>{conectado ? '● EN VIVO' : '○ desconectado'}</Text>
        </View>
        <Pressable
          onPress={cerrarSesion}
          style={({ pressed }) => [styles.salirBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}>
          <Text style={styles.salirTxt}>🚪</Text>
        </Pressable>
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
          label="Vibracion"
          valor={resumen.vibracion ? 'GOLPE' : 'Estable'}
          acento={resumen.vibracion ? COLORS.danger : COLORS.success}
        />
        <Metrica
          label="Corriente"
          valor={resumen.corriente !== null ? (resumen.corriente === 0 ? 'SIN ENERGIA' : `${resumen.corriente} W`) : '—'}
          acento={
            resumen.corriente === 0
              ? COLORS.danger
              : resumen.corriente !== null && resumen.corriente > 400
              ? COLORS.warning
              : COLORS.success
          }
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
  // Eventos discretos (vibracion, movimiento) se consideran "activos" solo
  // durante 20s desde la ultima lectura. Suficiente para ver el burst del
  // escenario sin quedarse en rojo para siempre.
  const haceVentana = Date.now() - 20_000;
  const recienteY1 = (tipo: string) => {
    const r = porTipo[tipo];
    return Boolean(
      r && r.valor === 1 && new Date(r.fecha).getTime() >= haceVentana,
    );
  };
  // Puerta abierta = cualquier MC-38 abierto en la ultima lectura por sensor.
  const alguna = (tipo: string) =>
    readings.some((x) => x.tipo === tipo && x.valor === 1);
  return {
    temperatura: porTipo.temperatura?.valor ?? null,
    humedad: porTipo.humedad?.valor ?? null,
    puertaAbierta: alguna('puerta'),
    movimientoReciente: recienteY1('movimiento'),
    vibracion: recienteY1('vibracion'),
    corriente: porTipo.corriente?.valor ?? null,
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
  subUsuario: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  salirBtn: { padding: 6, marginLeft: 8 },
  salirTxt: { fontSize: 22 },
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
