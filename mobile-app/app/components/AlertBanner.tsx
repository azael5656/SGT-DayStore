import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

/**
 * Tiempo maximo que la alarma vibra aunque no la reconozcas. Evita que el
 * telefono quede vibrando para siempre por un falso positivo o porque el
 * dueno dejo la app abierta. Al pasar este tiempo la alerta sigue en la UI
 * (roja y destacada) pero deja de "ladrar" fisicamente.
 */
const MAX_VIBRACION_MS = 20_000;
import { COLORS } from '../utils/constants';
import Icon from './Icon';
import type { Alert, AlertSeverity } from '../services/iot.service';

/**
 * Banner de alerta individual con boton para reconocer.
 * Las criticas NO reconocidas vibran en loop hasta que el usuario actua,
 * simulando que el buzzer esta sonando en la tienda.
 */

const COLOR_POR_SEVERIDAD: Record<AlertSeverity, string> = {
  baja: COLORS.textMuted,
  media: COLORS.warning,
  alta: COLORS.primary,
  critica: COLORS.danger,
};

const SEVERIDAD_LABEL: Record<AlertSeverity, string> = {
  baja: 'Informativa',
  media: 'Importante',
  alta: 'Urgente',
  critica: 'CRITICA',
};

/**
 * Protocolos que se muestran segun el tipo de alerta. Sirve para que el
 * dueno sepa que hacer sin tener que pensarlo en el momento.
 */
const PROTOCOLO: Record<string, string[]> = {
  incendio: [
    '1. Mantén la calma y evacúa la tienda.',
    '2. Llama a bomberos (911 o 123).',
    '3. Usa extintor solo si el fuego es pequeño y seguro.',
  ],
  forzado: [
    '1. NO te acerques al frente de la tienda.',
    '2. Llama a la policía (123).',
    '3. Revisa las cámaras desde un lugar seguro.',
  ],
  corte_luz: [
    '1. Verifica en el medidor si es corte general.',
    '2. Si solo es tu tienda, llama al electricista.',
    '3. Cuida la caja registradora y puertas electricas.',
  ],
};

interface Props {
  alerta: Alert;
  onAcknowledge: (id: string) => void;
}

export default function AlertBanner({ alerta, onAcknowledge }: Props) {
  const [vibracionExpirada, setVibracionExpirada] = useState(false);
  const debeVibrar =
    alerta.severidad === 'critica' &&
    !alerta.reconocida &&
    !vibracionExpirada;

  useEffect(() => {
    if (!debeVibrar) return;
    try {
      Vibration.vibrate([0, 500, 300, 500], true);
    } catch {
      /* sin vibrador o permiso */
    }
    const timeout = setTimeout(() => {
      setVibracionExpirada(true);
    }, MAX_VIBRACION_MS);
    return () => {
      clearTimeout(timeout);
      try {
        Vibration.cancel();
      } catch {
        /* idem */
      }
    };
  }, [debeVibrar]);

  const color = COLOR_POR_SEVERIDAD[alerta.severidad];
  const pasos = PROTOCOLO[alerta.tipo];

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeTxt}>
            {SEVERIDAD_LABEL[alerta.severidad]}
          </Text>
        </View>
        <Text style={styles.fecha}>
          {new Date(alerta.fecha).toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.tipoRow}>
        {alerta.tipo === 'incendio' ? (
          <Icon name="incendio" color={color} size={18} />
        ) : alerta.tipo === 'forzado' ? (
          <Icon name="buzzer" color={color} size={18} />
        ) : alerta.tipo === 'corte_luz' ? (
          <Icon name="luz" color={color} size={18} />
        ) : null}
        <Text style={styles.tipo}>
          {alerta.tipo === 'incendio'
            ? 'Posible incendio'
            : alerta.tipo === 'forzado'
            ? 'Intento de forzado'
            : alerta.tipo === 'corte_luz'
            ? 'Corte de energia'
            : alerta.tipo}
        </Text>
      </View>
      <Text style={styles.mensaje}>{alerta.mensaje}</Text>

      {pasos && !alerta.reconocida && (
        <View style={styles.protocolo}>
          <Text style={styles.protocoloTitulo}>Que hacer ahora</Text>
          {pasos.map((p) => (
            <Text key={p} style={styles.protocoloPaso}>
              {p}
            </Text>
          ))}
        </View>
      )}

      {!alerta.reconocida ? (
        <>
          <TouchableOpacity
            style={[styles.boton, { backgroundColor: color }]}
            onPress={() => onAcknowledge(alerta.id)}>
            <Icon name="check" color={COLORS.accentContrast} size={16} />
            <Text style={styles.botonTexto}>Marcar como revisada</Text>
          </TouchableOpacity>
          <Text style={styles.ayuda}>
            "Revisar" significa: ya la viste y actuaste. La alarma deja de vibrar.
          </Text>
        </>
      ) : (
        <View style={styles.reconocidaRow}>
          <Icon name="check" color={COLORS.success} size={15} />
          <Text style={styles.reconocida}>
            Revisada{' '}
            {alerta.reconocidaEn
              ? new Date(alerta.reconocidaEn).toLocaleTimeString()
              : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeTxt: {
    color: COLORS.accentContrast,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fecha: { fontSize: 12, color: COLORS.textMuted },
  tipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tipo: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  mensaje: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 10,
    lineHeight: 20,
  },
  protocolo: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  protocoloTitulo: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  protocoloPaso: {
    fontSize: 13,
    color: COLORS.warning,
    marginTop: 3,
  },
  boton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  botonTexto: {
    color: COLORS.accentContrast,
    fontWeight: '700',
    fontSize: 14,
  },
  ayuda: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  reconocidaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reconocida: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
});
