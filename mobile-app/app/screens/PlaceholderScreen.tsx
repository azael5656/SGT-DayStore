import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/constants';

interface Props {
  nombre: string;
}

/**
 * Pantalla placeholder para los 5 tabs del dashboard.
 * Muestra el nombre del tab y un boton de logout para probar el flujo.
 * Cada tab tendra su pantalla propia cuando se implemente la feature.
 */
export default function PlaceholderScreen({ nombre }: Props) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{nombre}</Text>
      <Text style={styles.subtitle}>Pantalla en desarrollo</Text>

      {user && (
        <Text style={styles.user}>
          Sesion de: {user.email} ({user.role})
        </Text>
      )}

      <TouchableOpacity style={styles.boton} onPress={logout}>
        <Text style={styles.botonTexto}>Cerrar sesion</Text>
      </TouchableOpacity>
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
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 8 },
  user: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 24,
  },
  boton: {
    marginTop: 32,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  botonTexto: { color: '#FFFFFF', fontWeight: '600' },
});
