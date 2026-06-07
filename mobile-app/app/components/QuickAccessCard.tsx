import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

interface Props {
  icono: string;
  titulo: string;
  subtitulo?: string;
  color: string;
  onPress: () => void;
  badge?: string | number;
}

/**
 * Card grande tappable para el home-hub. Cada seccion secundaria
 * (Ventas, Auditoria, Historico, Usuarios) se accede via estas cards.
 */
export default function QuickAccessCard({
  icono,
  titulo,
  subtitulo,
  color,
  onPress,
  badge,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: color },
        pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
          <Text style={styles.icono}>{icono}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo ? (
            <Text style={styles.subtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </View>
        {badge !== undefined && badge !== 0 && badge !== '0' && (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeTxt}>{badge}</Text>
          </View>
        )}
        <Text style={styles.arrow}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icono: { fontSize: 22 },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  subtitulo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  arrow: { fontSize: 24, color: COLORS.textMuted, fontWeight: '300' },
});
