import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { COLORS } from '../utils/constants';

const ROLE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  superadmin: {
    label: 'SUPER ADMIN',
    color: '#7C3AED',
    desc: 'Soporte del sistema. Gestiona todos los usuarios.',
  },
  admin: {
    label: 'ADMINISTRADOR',
    color: '#2563EB',
    desc: 'Dueno de la tienda. Control total de operacion.',
  },
  vendedor: {
    label: 'VENDEDOR',
    color: '#0EA5E9',
    desc: 'Registra ventas y atiende la tienda.',
  },
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  // Cambio de contrasena
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiarPassword = async () => {
    if (nueva.length < 6) {
      Alert.alert('Muy corta', 'La nueva contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      Alert.alert('No coincide', 'La confirmacion no coincide con la nueva contrasena.');
      return;
    }
    setGuardando(true);
    try {
      await api.put('/api/negocio/auth/change-password', {
        passwordActual: actual,
        passwordNueva: nueva,
      });
      Alert.alert('Listo', 'Tu contrasena fue actualizada.');
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message || 'Error al cambiar la contrasena';
      Alert.alert('No se pudo', msg);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarLogout = () => {
    Alert.alert('Cerrar sesion', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesion', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (!user) return null;
  const badge = ROLE_LABELS[user.role] ?? { label: user.role, color: COLORS.textMuted, desc: '' };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: badge.color }]}>
            <Text style={styles.avatarText}>
              {(user.nombre || user.email).slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.nombre}>{user.nombre || user.email}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: badge.color + '18', borderColor: badge.color }]}>
            <Text style={[styles.roleText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Text style={styles.roleDesc}>{badge.desc}</Text>
        </View>

        <Text style={styles.seccion}>Datos de tu cuenta</Text>
        <View style={styles.datos}>
          <Row label="ID de usuario" valor={user.id.slice(0, 12) + '...'} />
          <Row label="Rol" valor={badge.label} />
          <Row label="Correo" valor={user.email} />
        </View>

        <Text style={styles.seccion}>Cambiar contrasena</Text>
        <View style={styles.datos}>
          <Text style={styles.label}>Contrasena actual</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={actual}
            onChangeText={setActual}
            placeholder="••••••"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.label}>Nueva contrasena</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={nueva}
            onChangeText={setNueva}
            placeholder="Minimo 6 caracteres"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.label}>Confirmar nueva contrasena</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirmar}
            onChangeText={setConfirmar}
            placeholder="Repite la contrasena"
            placeholderTextColor={COLORS.textMuted}
          />
          <Pressable
            onPress={cambiarPassword}
            disabled={guardando || !actual || !nueva}
            style={({ pressed }) => [
              styles.btnPrimario,
              (guardando || !actual || !nueva) && { opacity: 0.4 },
              pressed && { opacity: 0.7 },
            ]}>
            <Text style={styles.btnPrimarioTxt}>
              {guardando ? 'Guardando...' : 'Actualizar contrasena'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={confirmarLogout}
          style={({ pressed }) => [styles.btnSalir, pressed && { opacity: 0.7 }]}>
          <Text style={styles.btnSalirTxt}>Cerrar sesion</Text>
        </Pressable>

        <Text style={styles.footer}>DayIsaacStore · v0.2</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  nombre: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  roleDesc: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  seccion: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
  datos: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { color: COLORS.textMuted, fontSize: 13 },
  rowValor: { color: COLORS.text, fontSize: 13, fontWeight: '600', maxWidth: '60%' },
  label: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  btnPrimario: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  btnPrimarioTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSalir: {
    marginTop: 28,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.danger,
  },
  btnSalirTxt: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 18,
  },
});
