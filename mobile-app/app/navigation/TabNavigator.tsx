import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AlertsScreen from '../screens/AlertsScreen';
import AuditoriaScreen from '../screens/AuditoriaScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import InventarioScreen from '../screens/InventarioScreen';
import PerfilScreen from '../screens/PerfilScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { COLORS, ROUTES } from '../utils/constants';

/**
 * Bottom tabs renderizados segun el rol del usuario logueado:
 *  - vendedor: Dashboard, Inventario, Ventas, Alertas, Perfil
 *  - admin/superadmin: + Auditoria, + Historico
 */
const Tab = createBottomTabNavigator();

const Ventas = () => <PlaceholderScreen nombre="Ventas" />;

const icono = (emoji: string) => ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size, color }}>{emoji}</Text>
);

export default function TabNavigator() {
  const { user } = useAuth();
  const esAdminOSuper = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}>
      <Tab.Screen
        name={ROUTES.Dashboard}
        component={DashboardScreen}
        options={{ tabBarIcon: icono('📊') }}
      />
      <Tab.Screen
        name={ROUTES.Inventario}
        component={InventarioScreen}
        options={{ tabBarIcon: icono('📦') }}
      />
      <Tab.Screen
        name={ROUTES.Ventas}
        component={Ventas}
        options={{ tabBarIcon: icono('💰') }}
      />
      <Tab.Screen
        name={ROUTES.Alertas}
        component={AlertsScreen}
        options={{ tabBarIcon: icono('🔔') }}
      />
      {esAdminOSuper && (
        <Tab.Screen
          name={ROUTES.Auditoria}
          component={AuditoriaScreen}
          options={{ tabBarIcon: icono('📋') }}
        />
      )}
      {esAdminOSuper && (
        <Tab.Screen
          name={ROUTES.Historico}
          component={HistoricoScreen}
          options={{ tabBarIcon: icono('📈') }}
        />
      )}
      <Tab.Screen
        name={ROUTES.Perfil}
        component={PerfilScreen}
        options={{ tabBarIcon: icono('👤') }}
      />
    </Tab.Navigator>
  );
}
