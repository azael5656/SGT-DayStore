import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de registro de usuarios. Placeholder por ahora.
 *
 * TODO: conectar con POST /auth/register. Requiere token de owner, asi
 * que en realidad esta pantalla la usa el dueño desde dentro de la app,
 * no es una pantalla publica. Revisar flujo con el equipo.
 */
export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro</Text>
      <Text style={styles.subtitle}>Pantalla en desarrollo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  title: { fontSize: 24, color: COLORS.text, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 8 },
});
