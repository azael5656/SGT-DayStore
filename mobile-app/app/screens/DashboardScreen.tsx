import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SensorCard from '../components/SensorCard';
import {
  iotService,
  SensorReading,
  TelemetryDashboard,
} from '../services/iot.service';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de dashboard para el duenio de la tienda.
 * Muestra un resumen de sensores + las ultimas lecturas individuales.
 * Refresca automaticamente cada 5 segundos.
 */
export default function DashboardScreen() {
  const [resumen, setResumen] = useState<TelemetryDashboard | null>(null);
  const [lecturas, setLecturas] = useState<SensorReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cargaInicial, setCargaInicial] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [dash, latest] = await Promise.all([
        iotService.telemetriaDashboard(),
        iotService.telemetriaLatest(),
      ]);
      setResumen(dash);
      setLecturas(latest);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar los datos',
      );
    } finally {
      setCargaInicial(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
    const id = setInterval(cargar, 5000);
    return () => clearInterval(id);
  }, [cargar]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  if (cargaInicial) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      <Text style={styles.titulo}>Resumen</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {resumen && (
        <View style={styles.gridResumen}>
          <Metrica label="Temperatura" valor={`${resumen.temperaturaActual}°C`} />
          <Metrica label="Humedad" valor={`${resumen.humedadActual}%`} />
          <Metrica
            label="Puerta"
            valor={resumen.puertaAbierta ? 'Abierta' : 'Cerrada'}
            acento={resumen.puertaAbierta ? COLORS.danger : COLORS.success}
          />
          <Metrica
            label="Movimiento"
            valor={resumen.movimientoUltimoMinuto ? 'Reciente' : 'Tranquilo'}
            acento={
              resumen.movimientoUltimoMinuto ? COLORS.warning : COLORS.success
            }
          />
          <Metrica label="Sensores activos" valor={String(resumen.sensoresActivos)} />
          <Metrica
            label="Alertas sin revisar"
            valor={String(resumen.alertasSinRevisar)}
            acento={resumen.alertasSinRevisar > 0 ? COLORS.danger : COLORS.success}
          />
        </View>
      )}

      <Text style={styles.titulo}>Ultimas lecturas</Text>

      {lecturas.length === 0 ? (
        <Text style={styles.vacio}>Aun no hay lecturas de sensores.</Text>
      ) : (
        lecturas.map((l) => <SensorCard key={l.sensorId + l.fecha} lectura={l} />)
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centro: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
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
  metricaValor: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  error: {
    color: COLORS.danger,
    marginBottom: 10,
  },
  vacio: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
