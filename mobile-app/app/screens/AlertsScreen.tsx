import React, { useCallback } from 'react';
import {
  Alert as RNAlert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AlertBanner from '../components/AlertBanner';
import { iotService } from '../services/iot.service';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de alertas. Listado realtime via Socket.IO.
 */
export default function AlertsScreen() {
  const { alerts, setAlerts, conectado } = useRealtimeIoT();

  const reconocer = useCallback(
    async (id: string) => {
      try {
        const alertaActualizada = await iotService.reconocerAlerta(id);
        // El backend tambien emitira alert.ack via socket, pero actualizamos
        // localmente para respuesta inmediata.
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? alertaActualizada : a)),
        );
      } catch (err) {
        RNAlert.alert(
          'No se pudo reconocer',
          err instanceof Error ? err.message : 'Error',
        );
      }
    },
    [setAlerts],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Alertas</Text>
        <View style={[styles.estado, conectado ? styles.estadoOn : styles.estadoOff]}>
          <Text style={styles.estadoTxt}>{conectado ? '● EN VIVO' : '○ reconectando'}</Text>
        </View>
      </View>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <AlertBanner alerta={item} onAcknowledge={reconocer} />
        )}
        ListEmptyComponent={
          <Text style={styles.vacio}>Todo tranquilo. Sin alertas.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  estado: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  estadoOn: { backgroundColor: '#DCFCE7' },
  estadoOff: { backgroundColor: '#FEE2E2' },
  estadoTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  lista: { padding: 14, paddingTop: 0 },
  vacio: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: 40,
    fontSize: 15,
  },
});
