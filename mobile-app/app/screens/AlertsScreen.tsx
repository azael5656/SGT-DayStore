import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AlertBanner from '../components/AlertBanner';
import { iotService, Alert as AlertaIoT } from '../services/iot.service';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de alertas. Lista las alertas generadas por los sensores.
 * Las criticas sin reconocer disparan vibracion (ver AlertBanner).
 * Refresca cada 5 segundos.
 */
export default function AlertsScreen() {
  const [alertas, setAlertas] = useState<AlertaIoT[]>([]);
  const [cargaInicial, setCargaInicial] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await iotService.alertas();
      setAlertas(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar las alertas',
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

  const reconocer = useCallback(
    async (id: string) => {
      try {
        await iotService.reconocerAlerta(id);
        setAlertas((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, reconocida: true, reconocidaEn: new Date().toISOString() }
              : a,
          ),
        );
      } catch (err) {
        RNAlert.alert(
          'No se pudo reconocer',
          err instanceof Error ? err.message : 'Error',
        );
      }
    },
    [],
  );

  if (cargaInicial) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={alertas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <AlertBanner alerta={item} onAcknowledge={reconocer} />
        )}
        ListEmptyComponent={
          <Text style={styles.vacio}>Todo tranquilo. Sin alertas.</Text>
        }
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
        }
      />
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
  lista: {
    padding: 14,
  },
  vacio: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: 40,
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    margin: 14,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
  },
});
