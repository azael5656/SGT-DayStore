import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/constants';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  superadmin: { label: 'SUPER ADMIN', color: '#7C3AED' },
  admin: { label: 'ADMINISTRADOR', color: '#2563EB' },
  vendedor: { label: 'VENDEDOR', color: '#0EA5E9' },
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const [saliendo, setSaliendo] = useState(false);

  const confirmarLogout = () => {
    Alert.alert(
      'Cerrar sesion',
      '¿Seguro que quieres cerrar la sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesion',
          style: 'destructive',
          onPress: async () => {
            setSaliendo(true);
            await logout();
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (!user) return null;
  const badge = ROLE_LABELS[user.role] ?? { label: user.role.toUpperCase(), color: COLORS.textMuted };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.nombre || user.email).slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.nombre}>{user.nombre || user.email}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: badge.color + '22', borderColor: badge.color }]}>
          <Text style={[styles.roleText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.acciones}>
        <Pressable
          style={({ pressed }) => [styles.btnLogout, pressed && { opacity: 0.7 }]}
          onPress={confirmarLogout}
          disabled={saliendo}>
          <Text style={styles.btnLogoutText}>
            {saliendo ? 'Cerrando...' : '🚪  Cerrar sesion'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>DayStore v0.1 · {user.id.slice(0, 8)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  nombre: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  acciones: { marginTop: 24 },
  btnLogout: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnLogoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 'auto',
    paddingTop: 20,
  },
});
