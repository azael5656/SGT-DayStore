import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

interface Props {
  nombre: string;
}

/** Pantalla simple para features aun no implementadas. */
export default function PlaceholderScreen({ nombre }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚧</Text>
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
  emoji: { fontSize: 56, marginBottom: 16 },
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
