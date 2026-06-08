import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '../components/Icon';
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
  AlertasDetalle: undefined;
  ConfigTiendaDetalle: undefined;
  TasasDetalle: undefined;
  Clientes: undefined;
  MiNegocioDetalle: undefined;
};
type Nav = StackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { readings, alerts, conectado } = useRealtimeIoT();
  const navigation = useNavigation<Nav>();
  const esAdminOSuper = user?.role === 'admin' || user?.role === 'superadmin';
  const esSuper = user?.role === 'superadmin';

  const sinRevisar = alerts.filter((a) => !a.reconocida).length;

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
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <View style={{ flex: 1 }}>
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
        <Pressable
          onPress={cerrarSesion}
          hitSlop={12}
          style={({ pressed }) => [styles.salirBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.salirTxt}>Salir</Text>
          <Icon name="salir" color={COLORS.text} size={15} />
        </Pressable>
      </View>

      {sinRevisar > 0 && (
        <Pressable
          onPress={() => navigation.getParent()?.navigate('Alertas')}
          style={({ pressed }) => [styles.alertBanner, pressed && { opacity: 0.85 }]}>
          <Icon name="alertas" color={COLORS.danger} size={26} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertBannerTitulo}>
              Tienes {sinRevisar} alerta{sinRevisar === 1 ? '' : 's'} sin revisar
            </Text>
            <Text style={styles.alertBannerSub}>
              Toca para verlas ahora
            </Text>
          </View>
          <Text style={styles.alertBannerArrow}>›</Text>
        </Pressable>
      )}

      <LiveStats readings={readings} conectado={conectado} alertasSinRevisar={sinRevisar} />

      <Pressable
        onPress={() => navigation.navigate('DashboardDetalle')}
        style={({ pressed }) => [styles.verMas, pressed && { opacity: 0.7 }]}>
        <Text style={styles.verMasTxt}>Ver dashboard completo →</Text>
      </Pressable>

      <Text style={styles.seccionTitulo}>Tu dia a dia</Text>

      <QuickAccessCard
        icono="💰"
        titulo="Ventas"
        subtitulo="Registra una venta o revisa el total del dia"
        color={COLORS.primary}
        onPress={() => navigation.navigate('VentasDetalle')}
      />

      {esAdminOSuper && (
        <>
          <Text style={styles.seccionTitulo}>Cómo va tu negocio</Text>

          <QuickAccessCard
            icono="📊"
            titulo="Mi negocio"
            subtitulo="Reportes, ventas, deudas, productos top"
            color={COLORS.primary}
            onPress={() => navigation.navigate('MiNegocioDetalle')}
          />

          <Text style={styles.seccionTitulo}>Gestion de la tienda</Text>

          <QuickAccessCard
            icono="📋"
            titulo="Actividad reciente"
            subtitulo="Mira todo lo que paso en la tienda"
            color={COLORS.primary}
            onPress={() => navigation.navigate('AuditoriaDetalle')}
          />

          <QuickAccessCard
            icono="📈"
            titulo="Tendencias"
            subtitulo="Revisa como se ha comportado la tienda"
            color={COLORS.primary}
            onPress={() => navigation.navigate('HistoricoDetalle')}
          />

          <QuickAccessCard
            icono="👥"
            titulo={esSuper ? 'Cuentas de usuarios' : 'Vendedores'}
            subtitulo={
              esSuper
                ? 'Crea, edita o desactiva administrador y vendedores'
                : 'Agrega nuevos vendedores a tu tienda'
            }
            color={COLORS.primary}
            onPress={() => navigation.navigate('UsuariosDetalle')}
          />

          <QuickAccessCard
            icono="🕒"
            titulo="Horario de la tienda"
            subtitulo="Horario, vacaciones y cierre temprano"
            color={COLORS.primary}
            onPress={() => navigation.navigate('ConfigTiendaDetalle')}
          />

          <QuickAccessCard
            icono="💱"
            titulo="Tasa del día"
            subtitulo="Configura cuánto vale el dólar hoy en Bs y COP"
            color={COLORS.primary}
            onPress={() => navigation.navigate('TasasDetalle')}
          />

          <QuickAccessCard
            icono="🧾"
            titulo="Clientes / Deudores"
            subtitulo="Registra clientes para ventas a crédito"
            color={COLORS.primary}
            onPress={() => navigation.navigate('Clientes')}
          />
        </>
      )}

      <Text style={styles.footer}>DayIsaacStore · v0.2</Text>
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
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  nombre: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  rol: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  salirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  salirTxt: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  alertBannerTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.danger,
  },
  alertBannerSub: { fontSize: 12, color: COLORS.danger, marginTop: 2 },
  alertBannerArrow: { fontSize: 26, color: COLORS.danger, fontWeight: '300' },
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
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 10,
    marginLeft: 2,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 18,
  },
});
