import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import Icon from '../components/Icon';
import AlertsScreen from '../screens/AlertsScreen';
import InventarioScreen from '../screens/InventarioScreen';
import PerfilScreen from '../screens/PerfilScreen';
import { COLORS, ROUTES } from '../utils/constants';
import HomeStack from './HomeStack';

/**
 * Bottom nav principal con 4 tabs fijos (no cambian por rol):
 *  - Home (hub): resumen + cards a secciones secundarias (filtradas por rol)
 *  - Inventario: CRUD de productos
 *  - Alertas: alertas IoT en vivo
 *  - Perfil: datos del usuario + logout
 *
 * Ventas, Auditoria, Historico, Usuarios se navegan dentro del HomeStack.
 */
const Tab = createBottomTabNavigator();

const icono = (name: string) => ({ color, size }: { color: string; size: number }) => (
  <Icon name={name} color={color} size={size} />
);

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { paddingTop: 4, height: 58 },
        headerShown: false,
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: 'Home', tabBarIcon: icono('home') }}
      />
      <Tab.Screen
        name={ROUTES.Inventario}
        component={InventarioScreen}
        options={{ tabBarIcon: icono('inventario'), headerShown: true }}
      />
      <Tab.Screen
        name={ROUTES.Alertas}
        component={AlertsScreen}
        options={{ tabBarIcon: icono('alertas'), headerShown: true }}
      />
      <Tab.Screen
        name={ROUTES.Perfil}
        component={PerfilScreen}
        options={{ tabBarIcon: icono('perfil'), headerShown: true }}
      />
    </Tab.Navigator>
  );
}
