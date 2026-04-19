import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/constants';

/**
 * Pantalla de login. Formulario minimo con email y password.
 * Usa el AuthContext para disparar la peticion y guardar los tokens.
 */
export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Falta informacion', 'Email y contraseña son obligatorios');
      return;
    }
    setCargando(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : 'Error al iniciar sesion';
      Alert.alert('No se pudo iniciar sesion', mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daystore</Text>
      <Text style={styles.subtitle}>Iniciar sesion</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.boton, cargando && styles.botonDeshabilitado]}
        onPress={onSubmit}
        disabled={cargando}>
        <Text style={styles.botonTexto}>
          {cargando ? 'Entrando...' : 'Entrar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: COLORS.textMuted,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: COLORS.text,
  },
  boton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
});
