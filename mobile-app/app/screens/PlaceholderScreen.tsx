import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '../components/Icon';
import { COLORS } from '../utils/constants';

interface Props {
  nombre: string;
}

/** Pantalla simple para features aun no implementadas. */
export default function PlaceholderScreen({ nombre }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name="tip" color={COLORS.primary} size={48} />
      </View>
      <Text style={styles.title}>{nombre}</Text>
      <Text style={styles.subtitle}>Esta seccion esta en desarrollo.</Text>
      <Text style={styles.hint}>
        Muy pronto la podras usar aqui mismo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  iconWrap: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 280,
  },
});
