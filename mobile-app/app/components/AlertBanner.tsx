import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { COLORS } from '../utils/constants';
import type { Alert, AlertSeverity } from '../services/iot.service';

/**
 * Banner de alerta individual con boton para reconocer.
 *
 * Si la alerta es critica y NO esta reconocida, vibra el telefono con un
 * patron repetitivo hasta que el usuario la reconozca o el banner se
 * desmonte. Esto implementa el "modo forzado" donde el duenio necesita ser
 * notificado fisicamente.
 */

const COLOR_POR_SEVERIDAD: Record<AlertSeverity, string> = {
  baja: COLORS.textMuted,
  media: COLORS.warning,
  alta: '#EA580C',
  critica: COLORS.danger,
};

interface Props {
  alerta: Alert;
  onAcknowledge: (id: string) => void;
}

export default function AlertBanner({ alerta, onAcknowledge }: Props) {
  const debeVibrar = alerta.severidad === 'critica' && !alerta.reconocida;

  useEffect(() => {
    if (!debeVibrar) return;
    try {
      // Patron: pausa 0ms, vibra 500ms, pausa 300ms, vibra 500ms, repetir.
      Vibration.vibrate([0, 500, 300, 500], true);
    } catch {
      // Dispositivo sin vibrador o permiso VIBRATE faltante: degradamos
      // silenciosamente. La alerta visual sigue funcionando.
    }
    return () => {
      try {
        Vibration.cancel();
      } catch {
        /* idem */
      }
    };
  }, [debeVibrar]);

  const color = COLOR_POR_SEVERIDAD[alerta.severidad];

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <Text style={[styles.severidad, { color }]}>
          {alerta.severidad.toUpperCase()}
        </Text>
        <Text style={styles.fecha}>
          {new Date(alerta.fecha).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.tipo}>{alerta.tipo}</Text>
      <Text style={styles.mensaje}>{alerta.mensaje}</Text>
      {!alerta.reconocida ? (
        <TouchableOpacity
          style={styles.boton}
          onPress={() => onAcknowledge(alerta.id)}>
          <Text style={styles.botonTexto}>Reconocer</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.reconocida}>
          Reconocida {alerta.reconocidaEn
            ? new Date(alerta.reconocidaEn).toLocaleString()
            : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  severidad: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fecha: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tipo: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  mensaje: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 10,
  },
  boton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  reconocida: {
    fontSize: 12,
    color: COLORS.success,
    fontStyle: 'italic',
  },
});
