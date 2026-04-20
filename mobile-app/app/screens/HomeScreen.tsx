import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LiveStats from '../components/LiveStats';
import QuickAccessCard from '../components/QuickAccessCard';
import { useAuth } from '../context/AuthContext';
import { useRealtimeIoT } from '../hooks/useRealtimeIoT';
import { COLORS } from '../utils/constants';

type HomeStackParamList = {
  Home: undefined;
  VentasDetalle: undefined;
  AuditoriaDetalle: undefined;
  HistoricoDetalle: undefined;
  UsuariosDetalle: undefined;
  DashboardDetalle: undefined;
};
type Nav = StackNavigationProp<HomeStackParamList>;

const SALUDOS = ['Hola', 'Qué tal', 'Buenas'];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { readings, alerts, conectado } = useRealtimeIoT();
  const navigation = useNavigation<Nav>();
  const esAdminOSuper = user?.role === 'admin' || user?.role === 'superadmin';
  const esSuper = user?.role === 'superadmin';

  const sinRevisar = alerts.filter((a) => !a.reconocida).length;
  const saludo = SALUDOS[new Date().getHours() % SALUDOS.length];

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesion', `¿Salir de la cuenta ${user?.email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesion', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hola}>{saludo},</Text>
          <Text style={styles.nombre} numberOfLines={1}>
            {user?.nombre || user?.email}
          </Text>
          <Text style={styles.rol}>
            {user?.role === 'superadmin'
              ? 'Super admin'
              : user?.role === 'admin'
              ? 'Administrador'
              : 'Vendedor'}
          </Text>
        </View>
        <Pressable onPress={cerrarSesion} hitSlop={12} style={styles.iconBtn}>
          <Text style={styles.iconTxt}>🚪</Text>
        </Pressable>
      </View>

      <LiveStats readings={readings} conectado={conectado} alertasSinRevisar={sinRevisar} />

      <Pressable
        onPress={() => navigation.navigate('DashboardDetalle')}
        style={({ pressed }) => [styles.verMas, pressed && { opacity: 0.7 }]}>
        <Text style={styles.verMasTxt}>Ver dashboard completo →</Text>
      </Pressable>

      <Text style={styles.seccionTitulo}>Operacion</Text>

      <QuickAccessCard
        icono="💰"
        titulo="Ventas"
        subtitulo="Registrar y consultar ventas"
        color="#16A34A"
        onPress={() => navigation.navigate('VentasDetalle')}
      />

      {esAdminOSuper && (
        <>
          <Text style={styles.seccionTitulo}>Administracion</Text>

          <QuickAccessCard
            icono="📋"
            titulo="Auditoria"
            subtitulo="Ver quien hizo que y cuando"
            color="#F59E0B"
            onPress={() => navigation.navigate('AuditoriaDetalle')}
          />

          <QuickAccessCard
            icono="📈"
            titulo="Historico IoT"
            subtitulo="Lecturas pasadas con tendencia"
            color="#0EA5E9"
            onPress={() => navigation.navigate('HistoricoDetalle')}
          />

          <QuickAccessCard
            icono="👥"
            titulo={esSuper ? 'Usuarios' : 'Vendedores'}
            subtitulo={
              esSuper ? 'CRUD total de cuentas' : 'Ver y crear vendedores'
            }
            color="#7C3AED"
            onPress={() => navigation.navigate('UsuariosDetalle')}
          />
        </>
      )}

      <Text style={styles.footer}>DayStore · v0.2</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 30 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  hola: { fontSize: 14, color: COLORS.textMuted },
  nombre: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  rol: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconTxt: { fontSize: 20 },
  verMas: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: -10,
    marginBottom: 14,
  },
  verMasTxt: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  seccionTitulo: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 8,
    marginLeft: 2,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 18,
  },
});
